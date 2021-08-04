'use strict';
module.exports = {
  up: async (queryInterface, DataTypes) => {
    await queryInterface.createTable('GuestShortenedUrls', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      url: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      parameter: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      expiredAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
    });
  },
  down: async (queryInterface, DataTypes) => {
    await queryInterface.dropTable('GuestShortenedUrls');
  },
};
