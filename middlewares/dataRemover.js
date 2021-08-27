const {Op} = require('sequelize');
const {error500} = require('../functions/errors');

const {GuestShortenedUrl, User, EmailVerification, PasswordReset} = require('../models');

exports.dataRemover = async (req, res, next) => {
  try {
    await GuestShortenedUrl.destroy({
      where: {
        expiredAt: {
          [Op.lt]: Date.now(),
        },
      },
    });
    await EmailVerification.destroy({
      where: {
        expiredAt: {
          [Op.lt]: Date.now(),
        },
      },
    });
    await PasswordReset.destroy({
      where: {
        expiredAt: {
          [Op.lt]: Date.now(),
        },
      },
    });
    await User.destroy({
      where: {
        expiredAt: {
          [Op.lt]: Date.now(),
        },
      },
    });
    next();
  } catch (error) {
    error500(error, next);
  }
};

