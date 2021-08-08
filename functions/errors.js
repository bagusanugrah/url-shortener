exports.error500 = (error, callback) => {
  console.log(error);
  const err = new Error(error);
  err.httpStatusCode = 500;
  return callback(err);
};
