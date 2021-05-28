const Response = require('../interfaces/response');

const handleMessage = {
sendError: function (res, code, status, message, error){
    const err = new Error(message);
    err.status = status;
    err.code = code;
    err.msg = message;
    (error) ? err.ERROR = error : '';
    return res.status(code).send(err);
},
sendSuccess: function (res, code, message, data, encode= true){
    Response.data = data;
    Response.msg = message;
    if(code){
        Response.code = code;
    }
    res.json(Response);
}

};
module.exports = handleMessage;
