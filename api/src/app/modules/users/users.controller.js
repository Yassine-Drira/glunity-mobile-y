'use strict';

const User         = require('../../../database/models/user.model');
const Product      = require('../../../database/models/product.model');
const Review       = require('../../../database/models/review.model');
const asyncHandler = require('../../common/utils/async-handler');
const AppError     = require('../../common/errors/app-error');
const { hashPassword, verifyPassword } = require('../../common/utils/password');

// Whitelist of fields users are allowed to update
const ALLOWED_FIELDS = ['fullName', 'phone', 'bio', 'language', 'darkMode', 'pushToken', 'pushEnabled', 'emailEnabled', 'twoFactorEnabled', 'dataSharingEnabled', 'publicProfileEnabled'];

const usersController = {
  // GET /api/users
  list: asyncHandler(async (req, res) => {
    const limit = req.query.limit !== undefined ? Number(req.query.limit) : 50;
    const skip = req.query.skip !== undefined ? Number(req.query.skip) : 0;
    const q = req.query.q !== undefined ? String(req.query.q).trim() : undefined;

    const { items } = await require('./users.service').list({ limit, skip, q });

    // Map to public representation
    const mapped = items.map((u) => (u && u.toPublic ? u.toPublic() : u));

    res.status(200).json({ success: true, data: mapped });
  }),
  /** PATCH /api/users/me — update the authenticated user's profile */
  updateMe: asyncHandler(async (req, res) => {
    const updates = {};
    ALLOWED_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (req.body.avatarUrl !== undefined) {
      updates.avatar = { url: req.body.avatarUrl };
    }

    if (req.body.storeInfo !== undefined) {
      // If storeInfo is provided, we merge it.
      // E.g. $set: { 'storeInfo.address': '...', 'storeInfo.operatingHours': '...' }
      for (const [key, value] of Object.entries(req.body.storeInfo)) {
        updates[`storeInfo.${key}`] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      throw AppError.badRequest('No valid fields provided to update', 'NO_FIELDS');
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    );

    if (!user) throw AppError.notFound('User');

    // Auto-synchronize store location on the collaborative Map
    if (user.profileType === 'pro_commerce' && req.body.storeInfo !== undefined) {
      try {
        const Location = require('../../../database/models/location.model');
        const storeInfo = user.storeInfo || {};
        const addressStr = (storeInfo.address || '').trim();
        
        let storeName = (storeInfo.storeName || '').trim();
        if (storeName.length < 2) {
          storeName = (user.fullName || '').trim();
        }
        if (storeName.length < 2) {
          storeName = 'Gluten-Free Store';
        }

        const phone = (storeInfo.phone || user.phone || '').trim();
        const description = (storeInfo.description || '').trim();
        const imageUrl = (storeInfo.imageUrl || '').trim();

        // 1. Determine if coordinates are specified in the address
        let coordinates = null;
        const coordMatch = addressStr.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
        if (coordMatch) {
          const lat = parseFloat(coordMatch[1]);
          const lng = parseFloat(coordMatch[2]);
          if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            coordinates = [lng, lat]; // GeoJSON [lng, lat]
          }
        }

        // 2. Find existing location or create new
        const locationDoc = await Location.findOne({ createdBy: user._id });

        if (locationDoc) {
          locationDoc.name = storeName;
          locationDoc.description = description;
          locationDoc.phone = phone;
          locationDoc.address = addressStr;
          locationDoc.images = imageUrl ? [{ url: imageUrl }] : [];
          if (coordinates) {
            locationDoc.location = {
              type: 'Point',
              coordinates: coordinates
            };
          }
          await locationDoc.save();
        } else {
          const defaultCoords = coordinates || [10.18153, 36.80649]; // Tunis fallback
          await Location.create({
            name: storeName,
            description: description,
            category: 'grocery',
            glutenFree: true,
            certified: true,
            address: addressStr,
            phone: phone,
            images: imageUrl ? [{ url: imageUrl }] : [],
            location: {
              type: 'Point',
              coordinates: defaultCoords
            },
            createdBy: user._id
          });
        }
      } catch (err) {
        console.error('Error auto-syncing location for user:', user._id, err);
      }
    }

    res.status(200).json({
      success: true,
      data: { user: user.toPublic() },
    });
  }),

  /** POST /api/users/change-password — update user password */
  changePassword: asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      throw AppError.badRequest('Both current and new password are required', 'MISSING_FIELDS');
    }

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) throw AppError.notFound('User');

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw AppError.badRequest('Invalid current password', 'INVALID_PASSWORD');
    }

    if (newPassword.length < 6) {
      throw AppError.badRequest('New password must be at least 6 characters long', 'PASSWORD_TOO_SHORT');
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  }),

  /** GET /api/users/me/seller-stats — get seller dashboard statistics */
  getSellerStats: asyncHandler(async (req, res) => {
    const sellerId = req.user._id;
    const now = new Date();

    // ── 1. Products ──────────────────────────────────────────────────────────
    const products = await Product.find({ sellerId }).select('_id name price category certifiedGF createdAt views');
    const productsCount = products.length;
    const productIds = products.map(p => p._id);

    // ── 1b. Reels ────────────────────────────────────────────────────────────
    const Reel = require('../../../database/models/reel.model');
    const reels = await Reel.find({ authorId: sellerId }).select('viewsCount likesCount commentsCount');
    const reelsCount = reels.length;
    const reelsViewsCount = reels.reduce((sum, r) => sum + (r.viewsCount || 0), 0);
    const reelsLikesCount = reels.reduce((sum, r) => sum + (r.likesCount || 0), 0);
    const reelsCommentsCount = reels.reduce((sum, r) => sum + (r.commentsCount || 0), 0);
    const reelsEngagementRate = reelsViewsCount > 0
      ? (((reelsLikesCount + reelsCommentsCount) / reelsViewsCount) * 100).toFixed(1)
      : '0.0';

    // Certified GF count
    const certifiedGFCount = products.filter(p => p.certifiedGF).length;

    // Average price
    const avgPrice = productsCount > 0
      ? (products.reduce((sum, p) => sum + (p.price || 0), 0) / productsCount).toFixed(2)
      : '0.00';

    // Categories breakdown
    const categoryCounts = {};
    products.forEach(p => {
      if (p.category) categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    });
    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    // ── 2. Reviews ───────────────────────────────────────────────────────────
    const reviews = await Review.find({ productId: { $in: productIds } }).select('rating productId createdAt');
    const totalReviews = reviews.length;

    const rating = totalReviews > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
      : null;

    // Rating distribution (1–5 stars)
    const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => { ratingDist[Math.round(r.rating)] = (ratingDist[Math.round(r.rating)] || 0) + 1; });

    // Most reviewed product
    const reviewsByProduct = {};
    reviews.forEach(r => {
      const pid = r.productId?.toString();
      if (pid) reviewsByProduct[pid] = (reviewsByProduct[pid] || 0) + 1;
    });
    let mostViewedProduct = productsCount > 0 ? products[0].name : 'No products yet';
    let maxReviewCount = 0;
    products.forEach(p => {
      const cnt = reviewsByProduct[p._id.toString()] || 0;
      if (cnt > maxReviewCount) { maxReviewCount = cnt; mostViewedProduct = p.name; }
    });

    // Top interaction day from review timestamps
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    reviews.forEach(r => { if (r.createdAt) dayCounts[new Date(r.createdAt).getDay()]++; });
    const topDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
    const topInteractionDay = totalReviews > 0 ? dayNames[topDayIdx] : 'Saturday';

    // ── 3. Analytics — real data only, no fake scaling ──────────────────────
    // All-time product views (sum of actual Product.views counters)
    const viewsAllTime = products.reduce((sum, p) => sum + (p.views || 0), 0);

    // Map clicks from actual DB counter (incremented on each map marker click)
    const latestUser = await User.findById(req.user._id).select('storeInfo');
    const mapClicksAllTime = (latestUser && latestUser.storeInfo && latestUser.storeInfo.mapClicks) || 0;

    // For the dashboard KPI cards, show the real totals
    // 7d views = total views (we don't have per-day granularity without event logs)
    const views = viewsAllTime;
    const viewsLast30Days = viewsAllTime; // same total — we track lifetime not windowed

    // Map clicks: same real count for both periods
    const mapClicks = mapClicksAllTime;
    const mapClicksLast30Days = mapClicksAllTime;

    // ── 4. Chart data — real counts per day (from review timestamps) ─────────
    const chartWeek = [];
    const chartLabels = [];
    const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const dayIdx = d.getDay();

      // Count reviews that were posted on this exact calendar date
      const reviewsOnDay = reviews.filter(r => {
        if (!r.createdAt) return false;
        const rd = new Date(r.createdAt);
        return rd.getFullYear() === d.getFullYear() &&
               rd.getMonth() === d.getMonth() &&
               rd.getDate() === d.getDate();
      }).length;

      // Real value: number of reviews on this day (each review = one real interaction)
      chartWeek.push(reviewsOnDay);
      chartLabels.push(shortDayNames[dayIdx]);
    }

    // 30-day chart — real review counts per day
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const recentReviews30d = reviews.filter(r => r.createdAt && new Date(r.createdAt) >= thirtyDaysAgo);
    const chartData30d = Array(30).fill(0);
    recentReviews30d.forEach(r => {
      const daysAgo = Math.floor((now - new Date(r.createdAt)) / (24 * 60 * 60 * 1000));
      const idx = Math.min(29, Math.max(0, 29 - daysAgo));
      chartData30d[idx] += 1;
    });
    // No scaling — raw real review counts per day
    const chartData30dScaled = chartData30d;

    // ── 5. Account age ───────────────────────────────────────────────────────
    const memberSinceDate = req.user.createdAt
      ? new Date(req.user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'Unknown';

    const accountAgeDays = req.user.createdAt
      ? Math.floor((now - new Date(req.user.createdAt)) / (24 * 60 * 60 * 1000))
      : 0;

    res.status(200).json({
      success: true,
      data: {
        // Traffic
        views,
        viewsLast30Days,
        mapClicks,
        mapClicksLast30Days,
        // Reviews
        rating,
        totalReviews,
        ratingDistribution: ratingDist,
        // Products
        productsCount,
        certifiedGFCount,
        avgPrice: parseFloat(avgPrice),
        topCategories,
        mostViewedProduct,
        // Reels
        reelsCount,
        reelsViewsCount,
        reelsLikesCount,
        reelsCommentsCount,
        reelsEngagementRate: parseFloat(reelsEngagementRate),
        // Engagement
        topInteractionDay,
        // Charts
        chartData: chartWeek,
        chartLabels,
        chartData30d: chartData30dScaled,
        // Account
        memberSince: memberSinceDate,
        accountAgeDays,
      },
    });
  }),

  /** POST /api/users/check-in — daily user check-in to get points and build streaks */
  checkIn: asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) throw AppError.notFound('User');

    const now = new Date();
    const todayStr = now.toDateString();
    
    if (user.lastCheckInAt && user.lastCheckInAt.toDateString() === todayStr) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_CHECKED_IN',
        message: 'You have already checked in today!'
      });
    }

    // Check if streak continues (last check-in was yesterday)
    let isStreakContinued = false;
    if (user.lastCheckInAt) {
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      if (user.lastCheckInAt.toDateString() === yesterday.toDateString()) {
        isStreakContinued = true;
      }
    }

    if (isStreakContinued) {
      user.streakDays += 1;
    } else {
      user.streakDays = 1; // Start new streak
    }

    user.lastCheckInAt = now;
    
    // Base is 10 points. Streak bonus up to 10 points.
    const basePoints = 10;
    const streakBonus = Math.min(user.streakDays, 10);
    const totalPointsEarned = basePoints + streakBonus;

    const badgesService = require('../badges/badges.service');
    const updatedUser = await badgesService.awardPointsAndCheckBadges(user._id, totalPointsEarned);
    
    user.points = updatedUser.points;
    user.badges = updatedUser.badges;
    await user.save();

    // Create a check-in achievement notification
    const notificationsService = require('../notifications/notifications.service');
    try {
      await notificationsService.create({
        userId: user._id,
        title: `Daily Check-In Completed! 🔥`,
        body: `You checked in today and earned +${totalPointsEarned} XP! Current streak: ${user.streakDays} ${user.streakDays === 1 ? 'day' : 'days'}.`,
        type: 'achievement',
        isRead: false
      });
    } catch (nErr) {
      console.warn('Failed to create check-in notification:', nErr);
    }

    res.status(200).json({
      success: true,
      data: {
        pointsEarned: totalPointsEarned,
        streakDays: user.streakDays,
        user: user.toPublic()
      }
    });
  }),

  /** GET /api/users/:id — get user/seller profile by ID */
  getById: asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).populate('badges');
    if (!user) throw AppError.notFound('User');

    res.status(200).json({
      success: true,
      data: user.toPublic(),
    });
  }),

  /** POST /api/users/me/groups/:groupId/pin — pin a group */
  pinGroup: asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) throw AppError.notFound('User');

    if (!user.pinnedGroups) {
      user.pinnedGroups = [];
    }
    if (!user.pinnedGroups.some(g => g.toString() === groupId.toString())) {
      user.pinnedGroups.push(groupId);
      await user.save();
    }

    res.status(200).json({
      success: true,
      data: { pinnedGroups: user.pinnedGroups }
    });
  }),

  /** DELETE /api/users/me/groups/:groupId/pin — unpin a group */
  unpinGroup: asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) throw AppError.notFound('User');

    if (user.pinnedGroups) {
      user.pinnedGroups = user.pinnedGroups.filter(g => g.toString() !== groupId.toString());
      await user.save();
    }

    res.status(200).json({
      success: true,
      data: { pinnedGroups: user.pinnedGroups }
    });
  }),
};

module.exports = usersController;
