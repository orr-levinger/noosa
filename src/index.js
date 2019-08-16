const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const port = 3000


const orgsToRulesMap = new Map([
    ['NIKE',new Map(
        [['Paynow', transaction => {
        return transaction;
    }],
    ])]
]);


app.use(bodyParser.json());
app.post('/:customername/transaction', async (req, res, next) => {
    try {
        const {body: transaction} = req;
        const {customername: customerName} = req.params;
        const result = orgsToRulesMap.get(customerName).get(transaction.type)(transaction);
        await fs.writeFile("test.json", JSON.stringify(req.body), function (err) {
            if (err) {
                res.status(404).json({
                    message: 'Failed to parse request',
                    more_info: err,
                });
            }

            res.status(201).send(result);

        });
    } catch (e) {
        res.status(500).json({
            message: 'Failed to parse request',
            more_info: e,
        });
    }
})


app.get('/:customername/balance', (req, res) => {

})


app.listen(port, () => console.log(`Example app listening on port ${port}!`))