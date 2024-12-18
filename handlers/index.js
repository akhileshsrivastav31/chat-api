const success = (res, response) => {
  response.data = response.data ? response.data : [];
  response.success = response.success ?? true;
  return res.status(200).json(response);
};

const error = (res, error) => {
  let httpStatusCode = error.statuscode ? error.statuscode : 500;
  let statusCode = error.statuscode ? error.statuscode : 400;
  let err = error.error ? error.error : [];
  error = {
    success: false,
    data: {},
    httpCode: httpStatusCode,
    msg: error.msg,
    error: { errorMessage: error.msg, errorCode: statusCode },
  };
  return res.status(statusCode).json(error);
};

module.exports = {
  success,
  error,
};
