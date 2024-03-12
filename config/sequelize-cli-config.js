module.exports = {
  development: {
    url: process.env.DATABASE_URI,
    dialect: 'postgresql'
  },
  production: {
    url: process.env.DATABASE_URI,
    dialect: 'postgresql'
  }
};
