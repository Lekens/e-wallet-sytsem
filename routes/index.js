const express = require('express');
const router = express.Router();

/* swagger. */
router.all('/', (req, res) => {
    // res.send('Welcome to Arokoyu Olalekan e-Wallet system');
    res.redirect(`${process.env.BASE_URL}${process.env.VERSION}/swagger-documentation`)

});
module.exports = router;
