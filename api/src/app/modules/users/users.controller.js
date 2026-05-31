'use strict';

const User         = require('../../../database/models/user.model');
const asyncHandler = require('../../common/utils/async-handler');
const AppError     = require('../../common/errors/app-error');
const { hashPassword, verifyPassword } = require('../../common/utils/password');

// Whitelist of fields users are allowed to update
const ALLOWED_FIELDS = ['fullName', 'phone', 'bio', 'language', 'darkMode', 'pushToken', 'pushEnabled', 'emailEnabled'];

const usersController = {
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

    if (Object.keys(updates).length === 0) {
      throw AppError.badRequest('No valid fields provided to update', 'NO_FIELDS');
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!user) throw AppError.notFound('User');

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
};

module.exports = usersController;
