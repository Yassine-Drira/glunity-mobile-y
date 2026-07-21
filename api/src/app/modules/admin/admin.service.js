'use strict';

const User = require('../../../database/models/user.model');
const Product = require('../../../database/models/product.model');
const Event = require('../../../database/models/event.model');
const Recipe = require('../../../database/models/recipe.model');
const Reel = require('../../../database/models/reel.model');
const Notification = require('../../../database/models/notification.model');

class AdminService {
  /**
   * Get real-time dashboard analytics from MongoDB Atlas collections
   * @param {string} period '7d' | '30d' | '3m' | '1y'
   */
  async getDashboardStats(period = '7d') {
    const now = new Date();
    let periodStart, prevPeriodStart, periodLabel;
    
    if (period === 'today') {
      periodStart = new Date(now);
      periodStart.setHours(0, 0, 0, 0);
      
      prevPeriodStart = new Date(periodStart);
      prevPeriodStart.setDate(prevPeriodStart.getDate() - 1);
      
      periodLabel = "aujourd'hui";
    } else {
      const daysOffset = period === '30d' ? 30 : period === '3m' ? 90 : period === '1y' ? 365 : 7;
      periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - daysOffset);

      prevPeriodStart = new Date(periodStart);
      prevPeriodStart.setDate(prevPeriodStart.getDate() - daysOffset);

      const periodLabels = {
        '7d': '7 derniers jours',
        '30d': '30 derniers jours',
        '3m': '3 derniers mois',
        '1y': '12 derniers mois',
      };
      periodLabel = periodLabels[period] || '7 derniers jours';
    }

    // 1. Run all base aggregate counts in parallel
    const [
      totalUsers,
      celiacUsers,
      sellerUsers,
      healthUsers,
      verifiedSellers,
      pendingSellersCount,
      pendingProducts,
      pendingEvents,
      pendingRecipes,
      pendingReels,
      approvedProducts,
      approvedEvents,
      approvedRecipes,
      approvedReels,
      newUsersInPeriod,
      prevUsersInPeriod,
      newProductsInPeriod,
      newEventsInPeriod,
      newRecipesInPeriod,
      newReelsInPeriod,
      totalProductsCount,
      totalEventsCount,
      totalRecipesCount,
      totalReelsCount,
      dau,
      wau,
      mau,
      onlineNow,
      topByXpRaw,
      recentRegistrations,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ profileType: 'celiac' }),
      User.countDocuments({ profileType: 'pro_commerce' }),
      User.countDocuments({ profileType: 'pro_health' }),
      User.countDocuments({ profileType: 'pro_commerce', 'storeInfo.isVerified': true }),
      User.countDocuments({ profileType: 'pro_commerce', $or: [{ 'storeInfo.isVerified': false }, { 'storeInfo.isVerified': { $exists: false } }, { isSellerVerified: false }] }),
      Product.countDocuments({ $or: [{ status: 'pending' }, { isApproved: false }, { isApproved: { $exists: false } }] }).catch(() => 0),
      Event.countDocuments({ $or: [{ status: 'pending' }, { isApproved: false }] }).catch(() => 0),
      Recipe.countDocuments({ $or: [{ status: 'pending' }, { isApproved: false }, { isApproved: { $exists: false } }] }).catch(() => 0),
      Reel.countDocuments({ status: { $in: ['processing', 'pending'] } }).catch(() => 0),
      Product.countDocuments({ $or: [{ status: 'approved' }, { isApproved: true }] }).catch(() => 0),
      Event.countDocuments({ $or: [{ status: 'active' }, { isApproved: true }] }).catch(() => 0),
      Recipe.countDocuments({ isApproved: true }).catch(() => 0),
      Reel.countDocuments({ status: 'ready' }).catch(() => 0),
      User.countDocuments({ createdAt: { $gte: periodStart } }),
      User.countDocuments({ createdAt: { $gte: prevPeriodStart, $lt: periodStart } }),
      Product.countDocuments({ createdAt: { $gte: periodStart } }).catch(() => 0),
      Event.countDocuments({ createdAt: { $gte: periodStart } }).catch(() => 0),
      Recipe.countDocuments({ createdAt: { $gte: periodStart } }).catch(() => 0),
      Reel.countDocuments({ createdAt: { $gte: periodStart } }).catch(() => 0),
      Product.countDocuments().catch(() => 0),
      Event.countDocuments().catch(() => 0),
      Recipe.countDocuments().catch(() => 0),
      Reel.countDocuments().catch(() => 0),
      User.countDocuments({ $or: [{ lastActiveAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }, { createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }] }),
      User.countDocuments({ $or: [{ lastActiveAt: { $gte: new Date(Date.now() - 7 * 86400000) } }, { createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } }] }),
      User.countDocuments({ $or: [{ lastActiveAt: { $gte: new Date(Date.now() - 30 * 86400000) } }, { createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } }] }),
      User.countDocuments({ onlineStatus: 'online' }),
      User.find({ isActive: true }).sort({ points: -1 }).limit(5).select('_id fullName points avatar profileType').lean(),
      User.find({}).sort({ createdAt: -1 }).limit(5).select('_id fullName profileType location createdAt avatar').lean(),
    ]);

    const totalPendingModeration = pendingProducts + pendingEvents + pendingRecipes + pendingReels;
    const totalApproved = approvedProducts + approvedEvents + approvedRecipes + approvedReels;
    const totalReviewed = totalApproved + totalPendingModeration;
    const approvalRatePercentage = totalReviewed > 0 ? Math.round((totalApproved / totalReviewed) * 100) : null;

    const usersGrowth = prevUsersInPeriod > 0
      ? Math.round(((newUsersInPeriod - prevUsersInPeriod) / prevUsersInPeriod) * 100 * 10) / 10
      : newUsersInPeriod > 0 ? 100 : 0;

    const contentSubmittedInPeriod = newProductsInPeriod + newEventsInPeriod + newRecipesInPeriod + newReelsInPeriod;

    // 2. Parallel Timeline Generation
    let groupingDays = 1;
    let numPointsAct = 7;
    let isTodayView = period === 'today';

    if (isTodayView) {
      numPointsAct = 8; // 8 blocks of 3 hours
    } else {
      groupingDays = period === '1y' ? 30 : period === '3m' ? 7 : period === '30d' ? 3 : 1;
      numPointsAct = period === '1y' ? 12 : period === '3m' ? 12 : period === '30d' ? 10 : 7;
    }

    const activityTimelinePromises = Array.from({ length: numPointsAct }, async (_, i) => {
      let dayStart, dayEnd, label;

      if (isTodayView) {
        dayStart = new Date(periodStart);
        dayStart.setHours(i * 3, 0, 0, 0);
        dayEnd = new Date(periodStart);
        dayEnd.setHours(i * 3 + 2, 59, 59, 999);
        label = `${i * 3}h`;
      } else {
        const idx = numPointsAct - 1 - i;
        dayStart = new Date(now);
        dayStart.setDate(now.getDate() - (idx * groupingDays) - (groupingDays === 1 ? 0 : groupingDays - 1));
        dayStart.setHours(0, 0, 0, 0);

        dayEnd = new Date(now);
        dayEnd.setDate(now.getDate() - (idx * groupingDays));
        dayEnd.setHours(23, 59, 59, 999);

        if (period === '1y') label = dayEnd.toLocaleDateString('fr-FR', { month: 'short' });
        else if (period === '3m') label = `Sem. ${Math.ceil(dayEnd.getDate()/7)}`;
        else if (period === '30d') label = dayEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' });
        else label = dayEnd.toLocaleDateString('fr-FR', { weekday: 'short' });
      }

      const [patientCount, reelCount, eventCount, prodMod, evMod, recMod, reelMod] = await Promise.all([
        User.countDocuments({ profileType: 'celiac', createdAt: { $gte: dayStart, $lte: dayEnd } }),
        Reel.countDocuments({ createdAt: { $gte: dayStart, $lte: dayEnd } }).catch(() => 0),
        Event.countDocuments({ createdAt: { $gte: dayStart, $lte: dayEnd } }).catch(() => 0),
        Product.countDocuments({ createdAt: { $gte: dayStart, $lte: dayEnd }, status: { $in: ['approved', 'rejected'] } }).catch(() => 0),
        Event.countDocuments({ createdAt: { $gte: dayStart, $lte: dayEnd }, status: { $in: ['active', 'rejected'] } }).catch(() => 0),
        Recipe.countDocuments({ createdAt: { $gte: dayStart, $lte: dayEnd }, status: { $in: ['published', 'rejected'] } }).catch(() => 0),
        Reel.countDocuments({ createdAt: { $gte: dayStart, $lte: dayEnd }, status: { $in: ['ready', 'rejected'] } }).catch(() => 0),
      ]);

      return {
        day: label,
        patients: patientCount,
        moderations: prodMod + evMod + recMod + reelMod,
        reels: reelCount,
        events: eventCount,
      };
    });

    const activityTimeline = await Promise.all(activityTimelinePromises);

    // 3. Category distribution — residual absorber on last item guarantees Σ = 100%
    const grandTotalContent = totalProductsCount + totalEventsCount + totalRecipesCount + totalReelsCount || 1;
    const _pctProducts = Math.round((totalProductsCount / grandTotalContent) * 100);
    const _pctEvents   = Math.round((totalEventsCount   / grandTotalContent) * 100);
    const _pctRecipes  = Math.round((totalRecipesCount  / grandTotalContent) * 100);
    const _pctReels    = Math.max(0, 100 - _pctProducts - _pctEvents - _pctRecipes);
    const contentCategories = [
      { name: 'Produits & Épicerie', percentage: _pctProducts, color: '#8BC34A' },
      { name: 'Événements',          percentage: _pctEvents,   color: '#3B82F6' },
      { name: 'Recettes Cœliaques',  percentage: _pctRecipes,  color: '#F59E0B' },
      { name: 'Reels Communauté',    percentage: _pctReels,    color: '#EC4899' },
    ];

    const topByXp = topByXpRaw.map(user => ({
      ...user,
      level: Math.floor((user.points || 0) / 100) + 1
    }));

    // 4. Parallel Registrations over time
    let numPoints = 7;
    if (isTodayView) {
      numPoints = 8;
    } else {
      groupingDays = period === '1y' ? 30 : period === '3m' ? 7 : 1;
      numPoints = period === '1y' ? 12 : period === '3m' ? 12 : period === '30d' ? 30 : 7;
    }

    const registrationsPromises = Array.from({ length: numPoints }, async (_, i) => {
      let dStart, dEnd, dateStr;
      
      if (isTodayView) {
        dStart = new Date(periodStart);
        dStart.setHours(i * 3, 0, 0, 0);
        dEnd = new Date(periodStart);
        dEnd.setHours(i * 3 + 2, 59, 59, 999);
        dateStr = `${i * 3}h`;
      } else {
        const idx = numPoints - 1 - i;
        dStart = new Date(now);
        dStart.setDate(now.getDate() - (idx * groupingDays) - groupingDays);
        dStart.setHours(0, 0, 0, 0);
        
        dEnd = new Date(now);
        dEnd.setDate(now.getDate() - (idx * groupingDays));
        dEnd.setHours(23, 59, 59, 999);
        
        if (period === '1y') dateStr = dEnd.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        else dateStr = dEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' });
      }
      
      const count = await User.countDocuments({ createdAt: { $gte: dStart, $lte: dEnd } });
      return { date: dateStr, count };
    });

    const registrationsByDay = await Promise.all(registrationsPromises);

    // 5. System Health & Latency
    const startDbTimer = Date.now();
    await User.findOne().select('_id').lean();
    const dbLatency = Date.now() - startDbTimer;

    const [notificationCount, emailsSent] = await Promise.all([
      Notification.countDocuments({ createdAt: { $gte: periodStart } }).catch(() => 0),
      Notification.countDocuments({ createdAt: { $gte: periodStart }, type: { $in: ['system', 'achievement', 'registration_request'] } }).catch(() => 0),
    ]);

    const platformHealth = {
      notifications: notificationCount,
      emailsSent: emailsSent,
      apiLatency: `${dbLatency}ms`,
      dbStatus: dbLatency < 500 ? 'Saine' : 'Lente'
    };

    // 6. Moderation Preview
    const allPendingRaw = await Promise.all([
      Product.find({ $or: [{ status: 'pending' }, { isApproved: false }] })
        .sort({ createdAt: 1 }).limit(2).lean()
        .then(docs => docs.map(d => ({ _id: d._id.toString(), type: 'product', title: d.name || 'Produit', authorName: d.brand || 'Inconnu', submittedAt: d.createdAt }))),
      Event.find({ $or: [{ status: 'pending' }, { isApproved: false }] })
        .sort({ createdAt: 1 }).limit(1).lean()
        .then(docs => docs.map(d => ({ _id: d._id.toString(), type: 'event', title: d.title || 'Événement', authorName: d.organizer || 'Inconnu', submittedAt: d.createdAt }))),
    ]).catch(() => [[], []]);

    const moderationPreview = [...allPendingRaw[0], ...allPendingRaw[1]].slice(0, 3);

    // 7. Real Clinical Health Insights — ZERO baselines, 100% real DB data
    // Fetch all users with celiac questionnaire data filled (globally, not period-scoped)
    // because health questionnaire is filled post-registration, not at registration time
    const allCeliacUsers = await User.find({
      $or: [
        { 'celiacQuestionnaire.symptoms.0': { $exists: true } },
        { 'celiacQuestionnaire.severity': { $exists: true, $ne: '' } },
        { 'celiacQuestionnaire.clinicalDiagnosis': true },
        { 'celiacQuestionnaire.familyHistory': true },
      ]
    }).select('birthDate gender dietaryPreference celiacQuestionnaire profileType').lean();

    const surveyedN = allCeliacUsers.length; // real respondents only
    const hasInsufficientData = surveyedN < 5; // honest threshold

    const symptomCounts  = { bloating: 0, fatigue: 0, abdominal_pain: 0, diarrhea: 0, nausea: 0, headache: 0 };
    const severityCounts = { mild: 0, moderate: 0, severe: 0 };
    let clinicalCount = 0;
    let familyHistoryCount = 0;
    const ageGroups    = { '18-25': 0, '26-35': 0, '36-50': 0, '50+': 0 };
    const dietaryCounts = { strict_gluten_free: 0, gluten_reduced: 0, seeking_diagnosis: 0 };
    const genderCounts  = { female: 0, male: 0, other: 0 };

    allCeliacUsers.forEach(u => {
      const q = u.celiacQuestionnaire;

      if (q && Array.isArray(q.symptoms) && q.symptoms.length > 0) {
        q.symptoms.forEach(s => {
          const key = String(s).toLowerCase().trim();
          if (key.includes('bloat') || key.includes('ballon') || key.includes('gaz') || key.includes('aerophag')) symptomCounts.bloating++;
          else if (key.includes('fatig') || key.includes('asthen') || key.includes('epuis')) symptomCounts.fatigue++;
          else if (key.includes('abdo') || key.includes('douleur') || key.includes('crampe') || key.includes('pain')) symptomCounts.abdominal_pain++;
          else if (key.includes('diarrh') || key.includes('transit') || key.includes('bowel')) symptomCounts.diarrhea++;
          else if (key.includes('naus') || key.includes('reflux') || key.includes('vomit')) symptomCounts.nausea++;
          else if (key.includes('tête') || key.includes('tete') || key.includes('headache') || key.includes('migrain')) symptomCounts.headache++;
        });
      }

      const sev = String(q?.severity || '').toLowerCase().trim();
      if (sev) {
        if (sev.includes('mild') || sev.includes('légère') || sev.includes('legere') || sev.includes('faible')) severityCounts.mild++;
        else if (sev.includes('sev') || sev.includes('sévère') || sev.includes('severe') || sev.includes('aigue') || sev.includes('forte')) severityCounts.severe++;
        else severityCounts.moderate++;
      }

      if (q?.clinicalDiagnosis === true) clinicalCount++;
      if (q?.familyHistory === true) familyHistoryCount++;

      if (u.birthDate) {
        const age = new Date().getFullYear() - new Date(u.birthDate).getFullYear();
        if (age <= 25) ageGroups['18-25']++;
        else if (age <= 35) ageGroups['26-35']++;
        else if (age <= 50) ageGroups['36-50']++;
        else ageGroups['50+']++;
      }

      const diet = String(u.dietaryPreference || '').toLowerCase();
      if (diet === 'gluten_reduced') dietaryCounts.gluten_reduced++;
      else if (diet === 'seeking_diagnosis') dietaryCounts.seeking_diagnosis++;
      else if (diet === 'strict_gluten_free') dietaryCounts.strict_gluten_free++;

      const g = String(u.gender || '').toLowerCase();
      if (g === 'female') genderCounts.female++;
      else if (g === 'male') genderCounts.male++;
      else if (g === 'other') genderCounts.other++;
    });

    // Compute symptom distribution — real counts only, Σ = 100% via residual absorber
    const totalSymptomMentions = symptomCounts.bloating + symptomCounts.fatigue + symptomCounts.abdominal_pain +
      symptomCounts.diarrhea + symptomCounts.nausea + symptomCounts.headache || 1;

    const safeN = surveyedN || 1;

    const pctBloating  = Math.round((symptomCounts.bloating       / totalSymptomMentions) * 100);
    const pctFatigue   = Math.round((symptomCounts.fatigue         / totalSymptomMentions) * 100);
    const pctAbdominal = Math.round((symptomCounts.abdominal_pain  / totalSymptomMentions) * 100);
    const pctDiarrhea  = Math.round((symptomCounts.diarrhea        / totalSymptomMentions) * 100);
    const pctNausea    = Math.round((symptomCounts.nausea          / totalSymptomMentions) * 100);
    const pctHeadache  = Math.max(0, 100 - pctBloating - pctFatigue - pctAbdominal - pctDiarrhea - pctNausea);

    // Severity Σ = 100% via residual absorber on moderate
    const totalSev = severityCounts.mild + severityCounts.moderate + severityCounts.severe || 1;
    const pctMild     = Math.round((severityCounts.mild   / totalSev) * 100);
    const pctSevere   = Math.round((severityCounts.severe / totalSev) * 100);
    const pctModerate = Math.max(0, 100 - pctMild - pctSevere);

    // Age groups — only users with birthDate count, others shown as "non renseigné"
    const totalWithAge = ageGroups['18-25'] + ageGroups['26-35'] + ageGroups['36-50'] + ageGroups['50+'] || 1;
    const pA1 = Math.round((ageGroups['18-25'] / totalWithAge) * 100);
    const pA3 = Math.round((ageGroups['36-50'] / totalWithAge) * 100);
    const pA4 = Math.round((ageGroups['50+']   / totalWithAge) * 100);
    const pA2 = Math.max(0, 100 - pA1 - pA3 - pA4);

    // Diet — only filled responses count
    const totalDiet = dietaryCounts.strict_gluten_free + dietaryCounts.gluten_reduced + dietaryCounts.seeking_diagnosis || 1;
    const pDS = Math.round((dietaryCounts.strict_gluten_free / totalDiet) * 100);
    const pDR = Math.round((dietaryCounts.gluten_reduced     / totalDiet) * 100);
    const pDK = Math.max(0, 100 - pDS - pDR);

    // Clinical / Family: real percentages out of respondents
    const pctClinical = Math.round((clinicalCount     / safeN) * 100);
    const pctFamily   = Math.round((familyHistoryCount / safeN) * 100);

    const questionnaireStats = {
      totalSurveyed: surveyedN,
      hasInsufficientData,
      isGlobalFallback: false,
      dataSourceLabel: hasInsufficientData
        ? `Données insuffisantes — ${surveyedN} répondant(s) sur ${totalUsers} utilisateurs`
        : `${surveyedN} répondants (données réelles)`,
      symptoms: hasInsufficientData ? [] : [
        { id: 'bloating',      label: 'Ballonnements & Gaz',           count: symptomCounts.bloating,       pct: pctBloating,  prevalencePct: Math.min(100, Math.round((symptomCounts.bloating      / safeN) * 100)), color: '#EF4444' },
        { id: 'fatigue',       label: 'Fatigue Chronique',             count: symptomCounts.fatigue,        pct: pctFatigue,   prevalencePct: Math.min(100, Math.round((symptomCounts.fatigue       / safeN) * 100)), color: '#F59E0B' },
        { id: 'abdominal_pain',label: 'Douleurs Abdominales',          count: symptomCounts.abdominal_pain, pct: pctAbdominal, prevalencePct: Math.min(100, Math.round((symptomCounts.abdominal_pain / safeN) * 100)), color: '#EC4899' },
        { id: 'diarrhea',      label: 'Troubles Transit / Diarrhée',   count: symptomCounts.diarrhea,       pct: pctDiarrhea,  prevalencePct: Math.min(100, Math.round((symptomCounts.diarrhea      / safeN) * 100)), color: '#8B5CF6' },
        { id: 'nausea',        label: 'Nausées & Reflux',              count: symptomCounts.nausea,         pct: pctNausea,    prevalencePct: Math.min(100, Math.round((symptomCounts.nausea        / safeN) * 100)), color: '#3B82F6' },
        { id: 'headache',      label: 'Maux de Tête & Migraines',      count: symptomCounts.headache,       pct: pctHeadache,  prevalencePct: Math.min(100, Math.round((symptomCounts.headache      / safeN) * 100)), color: '#10B981' },
      ],
      severity: {
        mild:     { count: severityCounts.mild,     pct: pctMild },
        moderate: { count: severityCounts.moderate, pct: pctModerate },
        severe:   { count: severityCounts.severe,   pct: pctSevere },
        hasData: totalSev > 1,
      },
      clinicalDiagnosisPct: pctClinical,
      clinicalDiagnosisCount: clinicalCount,
      familyHistoryPct: pctFamily,
      familyHistoryCount,
      ageGroups: [
        { label: '18-25 ans', count: ageGroups['18-25'], pct: pA1 },
        { label: '26-35 ans', count: ageGroups['26-35'], pct: pA2 },
        { label: '36-50 ans', count: ageGroups['36-50'], pct: pA3 },
        { label: '50+ ans',   count: ageGroups['50+'],   pct: pA4 },
      ],
      ageGroupsHasData: (ageGroups['18-25'] + ageGroups['26-35'] + ageGroups['36-50'] + ageGroups['50+']) > 0,
      dietaryPreferences: [
        { id: 'strict_gluten_free', label: 'Régime Sans Gluten Strict',      count: dietaryCounts.strict_gluten_free, pct: pDS },
        { id: 'gluten_reduced',     label: 'Sans Gluten Partiel / Réduit',   count: dietaryCounts.gluten_reduced,     pct: pDR },
        { id: 'seeking_diagnosis',  label: 'En Quête de Diagnostic',         count: dietaryCounts.seeking_diagnosis,  pct: pDK },
      ],
      dietaryHasData: totalDiet > 1,
      gender: {
        female: { count: genderCounts.female, pct: Math.round((genderCounts.female / Math.max(genderCounts.female + genderCounts.male + genderCounts.other, 1)) * 100) },
        male:   { count: genderCounts.male,   pct: Math.round((genderCounts.male   / Math.max(genderCounts.female + genderCounts.male + genderCounts.other, 1)) * 100) },
        other:  { count: genderCounts.other,  pct: Math.max(0, 100 - Math.round((genderCounts.female / Math.max(genderCounts.female + genderCounts.male + genderCounts.other, 1)) * 100) - Math.round((genderCounts.male / Math.max(genderCounts.female + genderCounts.male + genderCounts.other, 1)) * 100)) },
      },
    };

    // 8. Auth Method Breakdown — Google / Facebook / Email (real counts)
    const [googleCount, facebookCount] = await Promise.all([
      User.countDocuments({ googleId:   { $exists: true, $ne: null } }),
      User.countDocuments({ facebookId: { $exists: true, $ne: null } }),
    ]);
    const emailCount = totalUsers - googleCount - facebookCount;
    const authTotal  = totalUsers || 1;
    const pGoogle   = Math.round((googleCount   / authTotal) * 100);
    const pFacebook = Math.round((facebookCount / authTotal) * 100);
    const pEmail    = Math.max(0, 100 - pGoogle - pFacebook);

    const authMethodStats = {
      total: totalUsers,
      email:    { count: emailCount,    pct: pEmail },
      google:   { count: googleCount,   pct: pGoogle },
      facebook: { count: facebookCount, pct: pFacebook },
    };


    return {
      period,
      periodLabel,
      totalUsers,
      newUsersInPeriod,
      contentSubmittedInPeriod,
      usersGrowth,
      verifiedSellers,
      pendingSellersCount,
      approvalRatePercentage,
      pendingModeration: {
        total: totalPendingModeration,
        products: pendingProducts,
        events: pendingEvents,
        recipes: pendingRecipes,
        reels: pendingReels,
      },
      userDistribution: {
        celiac: celiacUsers,
        seller: sellerUsers,
        health: healthUsers,
      },
      activityTimeline,
      contentCategories,
      registrationsByDay,
      activeUsers: { dau, wau, mau },
      onlineNow,
      topByXp,
      recentRegistrations,
      platformHealth,
      moderationPreview,
      questionnaireStats,
      authMethodStats,
    };
  }

  // --- MODERATION ---
  async getModerationItems(type = 'all') {
    let results = [];
    const queries = [];
    
    if (type === 'all' || type === 'products') {
      queries.push(Product.find({ $or: [{ status: 'pending' }, { isApproved: false }, { isApproved: { $exists: false } }] }).lean().then(docs => docs.map(d => ({
        id: d._id.toString(), title: d.name || 'Produit Sans Titre', type: 'product', authorOrSeller: d.brand || 'Inconnu', date: d.createdAt, price: d.price ? `${d.price} €` : undefined
      }))));
    }
    if (type === 'all' || type === 'events') {
      queries.push(Event.find({ $or: [{ status: 'pending' }, { isApproved: false }] }).lean().then(docs => docs.map(d => ({
        id: d._id.toString(), title: d.title || 'Événement', type: 'event', authorOrSeller: d.organizer || 'Inconnu', date: d.createdAt, eventDate: d.date ? d.date.toString() : undefined, location: d.location
      }))));
    }
    if (type === 'all' || type === 'recipes') {
      queries.push(Recipe.find({ $or: [{ status: 'pending' }, { isApproved: false }, { isApproved: { $exists: false } }] }).lean().then(docs => docs.map(d => ({
        id: d._id.toString(), title: d.title || 'Recette', type: 'recipe', authorOrSeller: d.authorName || 'Inconnu', date: d.createdAt
      }))));
    }
    if (type === 'all' || type === 'reels') {
      queries.push(Reel.find({ status: { $in: ['processing', 'pending'] } }).populate('user', 'fullName').lean().then(docs => docs.map(d => ({
        id: d._id.toString(), title: d.caption || 'Reel', type: 'reel', authorOrSeller: d.user?.fullName || 'Inconnu', date: d.createdAt
      }))));
    }

    const arrays = await Promise.all(queries);
    arrays.forEach(arr => { results = results.concat(arr); });
    return results.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async moderateItem(id, type, action, reason) {
    let model;
    let update = {};
    if (type === 'product') { model = Product; update = action === 'approve' ? { status: 'approved', isApproved: true } : { status: 'rejected' }; }
    else if (type === 'event') { model = Event; update = action === 'approve' ? { status: 'active', isApproved: true } : { status: 'rejected' }; }
    else if (type === 'recipe') { model = Recipe; update = action === 'approve' ? { status: 'published', isApproved: true } : { status: 'rejected' }; }
    else if (type === 'reel') { model = Reel; update = action === 'approve' ? { status: 'ready' } : { status: 'rejected' }; }
    
    if (!model) throw new Error('Type inconnu');
    const item = await model.findByIdAndUpdate(id, update, { new: true });
    
    // Create In-App Notification (Simulate email dispatching as requested in the plan)
    if (item && (item.author || item.user)) {
      const targetUserId = item.author || item.user;
      const msg = action === 'approve'
        ? 'Votre contenu a été approuvé par la modération.'
        : `Votre contenu a été refusé. Motif: ${reason || 'Non conforme'}`;
      await Notification.create({
        recipientId: targetUserId,
        userId: targetUserId,
        type: 'system',
        title: action === 'approve' ? 'Publication validée' : 'Publication refusée',
        body: msg,
        message: msg,
      }).catch(err => console.warn('Failed to dispatch moderation notification:', err.message));
    }
    return item;
  }

  // --- USERS ---
  async getUsers(filter = 'all', search = '') {
    const query = {};
    if (filter === 'suspended') { query.isActive = false; }
    else if (filter !== 'all') { query.profileType = filter; }
    if (search) { query.fullName = { $regex: search, $options: 'i' }; }
    
    const users = await User.find(query).sort({ createdAt: -1 }).lean();
    return users.map(u => ({
      id: u._id.toString(),
      fullName: u.fullName || 'Utilisateur',
      email: u.email,
      profileType: u.profileType,
      status: u.isActive !== false ? 'active' : 'suspended',
      joinedDate: u.createdAt,
      city: u.location || 'Non spécifié',
      points: u.points || 0,
      streakDays: u.streakDays || 0
    }));
  }

  async toggleUserStatus(id, status) {
    const isActive = status === 'active';
    const user = await User.findByIdAndUpdate(id, { isActive }, { new: true });
    
    if (user) {
      const msg = isActive ? 'Votre compte a été réactivé par un administrateur.' : 'Votre compte a été suspendu suite à une infraction aux règles.';
      await Notification.create({
        recipientId: user._id,
        userId: user._id,
        type: 'system',
        title: isActive ? 'Compte Réactivé' : 'Compte Suspendu',
        body: msg,
        message: msg,
      }).catch(err => console.warn('Failed to dispatch notification:', err.message));
    }
    return user;
  }

  // --- SELLERS ---
  async getSellerVerifications() {
    const sellers = await User.find({
      profileType: 'pro_commerce',
      $or: [{ 'storeInfo.isVerified': false }, { 'storeInfo.isVerified': { $exists: false } }, { isSellerVerified: false }],
    }).lean();

    return sellers.map(s => ({
      id: s._id.toString(),
      storeName: s.storeInfo?.name || s.fullName,
      ownerName: s.fullName,
      email: s.email,
      phone: s.phone || 'Non renseigné',
      siret: s.storeInfo?.siret || 'Non renseigné',
      address: s.location || 'Non renseigné',
      certifications: s.storeInfo?.certifications?.join(', ') || 'Aucune',
      documents: s.storeInfo?.documents || [],
      submittedDate: s.createdAt,
    }));
  }

  async processSellerBadge(id, action, remarks) {
    const isVerified = action === 'approve';
    const update = { 'storeInfo.isVerified': isVerified, isSellerVerified: isVerified };
    const user = await User.findByIdAndUpdate(id, update, { new: true });

    if (user) {
      const msg = isVerified ? 'Félicitations, votre badge Vendeur Vérifié a été accordé!' : `Votre demande a été refusée. ${remarks || ''}`;
      await Notification.create({
        recipientId: user._id,
        userId: user._id,
        type: 'system',
        title: isVerified ? 'Badge Vendeur Vérifié' : 'Vérification Vendeur Refusée',
        body: msg,
        message: msg,
      }).catch(err => console.warn('Failed to dispatch notification:', err.message));
    }
    return user;
  }

  // --- PATIENT RESOURCES MANAGEMENT & ANALYTICS ---
  async getPatientResources(filters = {}) {
    const PatientResource = require('../../../database/models/patient-resource.model');
    const { ResourceVideo } = require('../../../database/models/patient-resource.model');

    const query = {};
    if (filters.category) query.category = filters.category;
    if (filters.type) query.type = filters.type;
    if (filters.status === 'Published') query.isPublished = true;
    if (filters.status === 'Draft') query.isPublished = false;

    const [articles, videos] = await Promise.all([
      PatientResource.find(query).sort({ createdAt: -1 }).lean(),
      filters.type && filters.type !== 'video' ? Promise.resolve([]) : ResourceVideo.find({}).sort({ createdAt: -1 }).lean(),
    ]);

    const mappedArticles = articles.map(d => ({
      id: d._id.toString(),
      type: d.type || (d.videoUrl ? 'video' : d.fileUrl ? 'document' : 'article'),
      title: d.title,
      excerpt: d.excerpt || '',
      body: d.body || '',
      fileUrl: d.fileUrl || null,
      videoUrl: d.videoUrl || null,
      category: d.category,
      author: d.authorName || 'Équipe Médicale Glu10',
      viewsCount: d.viewsCount || 0,
      clicksCount: d.clicksCount || 0,
      status: d.isPublished ? 'Published' : 'Draft',
      isPublished: d.isPublished !== undefined ? d.isPublished : true,
      isFeatured: d.isFeatured || false,
      readMinutes: d.readMinutes || 5,
      coverImageUrl: d.coverImageUrl || null,
      date: d.createdAt || new Date().toISOString(),
    }));

    const mappedVideos = videos.map(v => ({
      id: v._id.toString(),
      type: 'video',
      title: v.title,
      excerpt: v.presenter ? `Présenté par ${v.presenter}` : '',
      body: '',
      fileUrl: null,
      videoUrl: v.videoUrl,
      category: v.category,
      author: v.presenter || 'Intervenant Vidéo',
      viewsCount: v.viewsCount || 0,
      clicksCount: v.clicksCount || 0,
      status: v.isPublished ? 'Published' : 'Draft',
      isPublished: v.isPublished !== undefined ? v.isPublished : true,
      isFeatured: false,
      readMinutes: v.durationMinutes || 10,
      coverImageUrl: v.thumbnailUrl || null,
      date: v.createdAt || new Date().toISOString(),
    }));

    return [...mappedArticles, ...mappedVideos];
  }

  sanitizeCategory(cat) {
    const valid = ['celiac-disease', 'diet-basics', 'safe-foods', 'lifestyle-tips'];
    if (valid.includes(cat)) return cat;
    const lower = String(cat || '').toLowerCase();
    if (lower.includes('guide') || lower.includes('régime') || lower.includes('base')) return 'diet-basics';
    if (lower.includes('fiche') || lower.includes('aliment') || lower.includes('recette') || lower.includes('produit')) return 'safe-foods';
    if (lower.includes('conseil') || lower.includes('vie') || lower.includes('quotidien')) return 'lifestyle-tips';
    return 'celiac-disease';
  }

  async createPatientResource(data) {
    const PatientResource = require('../../../database/models/patient-resource.model');
    const payload = {
      type: data.type || 'article',
      title: data.title,
      excerpt: data.excerpt || (data.title ? `${data.title.substring(0, 150)}...` : 'Extrait ressource'),
      body: data.body || data.content || '',
      fileUrl: data.fileUrl || null,
      videoUrl: data.videoUrl || null,
      category: this.sanitizeCategory(data.category),
      authorName: data.author || data.authorName || 'Équipe Médicale Glu10',
      readMinutes: Number(data.readMinutes) || 5,
      isFeatured: Boolean(data.isFeatured),
      isPublished: data.status ? data.status === 'Published' : (data.isPublished !== undefined ? Boolean(data.isPublished) : true),
      coverImageUrl: data.coverImageUrl || null,
    };
    const created = await PatientResource.create(payload);
    const d = created.toObject();
    return {
      id: d._id.toString(),
      type: d.type,
      title: d.title,
      excerpt: d.excerpt,
      body: d.body,
      fileUrl: d.fileUrl,
      videoUrl: d.videoUrl,
      category: d.category,
      author: d.authorName,
      viewsCount: d.viewsCount || 0,
      clicksCount: d.clicksCount || 0,
      status: d.isPublished ? 'Published' : 'Draft',
      isPublished: d.isPublished,
      isFeatured: d.isFeatured,
      readMinutes: d.readMinutes,
      coverImageUrl: d.coverImageUrl,
      date: d.createdAt,
    };
  }

  async updatePatientResource(id, data) {
    const PatientResource = require('../../../database/models/patient-resource.model');
    const updateData = {};
    if (data.type !== undefined) updateData.type = data.type;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
    if (data.body !== undefined || data.content !== undefined) updateData.body = data.body || data.content;
    if (data.fileUrl !== undefined) updateData.fileUrl = data.fileUrl;
    if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl;
    if (data.category !== undefined) updateData.category = this.sanitizeCategory(data.category);
    if (data.author !== undefined || data.authorName !== undefined) updateData.authorName = data.author || data.authorName;
    if (data.readMinutes !== undefined) updateData.readMinutes = Number(data.readMinutes);
    if (data.isFeatured !== undefined) updateData.isFeatured = Boolean(data.isFeatured);
    if (data.status !== undefined) updateData.isPublished = data.status === 'Published';
    if (data.isPublished !== undefined) updateData.isPublished = Boolean(data.isPublished);
    if (data.coverImageUrl !== undefined) updateData.coverImageUrl = data.coverImageUrl;

    const updated = await PatientResource.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!updated) return null;

    return {
      id: updated._id.toString(),
      type: updated.type,
      title: updated.title,
      excerpt: updated.excerpt,
      body: updated.body,
      fileUrl: updated.fileUrl,
      videoUrl: updated.videoUrl,
      category: updated.category,
      author: updated.authorName,
      viewsCount: updated.viewsCount || 0,
      clicksCount: updated.clicksCount || 0,
      status: updated.isPublished ? 'Published' : 'Draft',
      isPublished: updated.isPublished,
      isFeatured: updated.isFeatured,
      readMinutes: updated.readMinutes,
      coverImageUrl: updated.coverImageUrl,
      date: updated.createdAt,
    };
  }

  async deletePatientResource(id) {
    const PatientResource = require('../../../database/models/patient-resource.model');
    const { ResourceVideo } = require('../../../database/models/patient-resource.model');
    
    await PatientResource.findByIdAndDelete(id);
    await ResourceVideo.findByIdAndDelete(id).catch(() => {});
    return true;
  }

  async getPatientResourceAnalytics() {
    const PatientResource = require('../../../database/models/patient-resource.model');
    const { ResourceVideo } = require('../../../database/models/patient-resource.model');

    const [resources, videos] = await Promise.all([
      PatientResource.find().lean(),
      ResourceVideo.find().lean(),
    ]);

    const articlesCount = resources.filter(r => (r.type || 'article') === 'article').length;
    const documentsCount = resources.filter(r => r.type === 'document').length;
    const videosCount = videos.length + resources.filter(r => r.type === 'video').length;

    let totalViews = 0;
    let totalClicks = 0;

    for (const r of resources) {
      totalViews += (r.viewsCount || 0);
      totalClicks += (r.clicksCount || 0);
    }
    for (const v of videos) {
      totalViews += (v.viewsCount || 0);
      totalClicks += (v.clicksCount || 0);
    }

    return {
      totalResources: resources.length + videos.length,
      articlesCount,
      documentsCount,
      videosCount,
      totalViews,
      totalClicks,
    };
  }
}

module.exports = new AdminService();
