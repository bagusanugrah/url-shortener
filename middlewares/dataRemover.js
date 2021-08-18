const {Op} = require('sequelize');

const {GuestShortenedUrl, User, EmailVerification, PasswordReset} = require('../models');

exports.dataRemover = async (req, res, next) => {
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
};

