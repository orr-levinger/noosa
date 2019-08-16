const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const port = 3000


function NikePayNow() {
    return transaction => {
        return transaction;
    };
}

function NikePayNow() {
    return transaction => {
        const toAdd = Math.min(12, transaction.amount/100*3);
        return {
            ...transaction,
            total: toAdd
        };
    };
}

const orgsToRulesMap = new Map([
    [
        'Nike'.toLowerCase(), new Map([
            ['Pay now'.toLowerCase(), (NikePayNow())],
            ['Pay with Installments'.toLowerCase(), (NikePayNow())],
            ['Refund payment'.toLowerCase(), (NikePayNow())],
        ]),
        'H&M'.toLowerCase(), new Map(
        [['Pay with Installments', (NikePayNow())],
        ]),
        'H&M'.toLowerCase(), new Map(
        [['Refund payment', (NikePayNow())],
        ]),
    ]
]);


app.use(bodyParser.json());
app.post('/:customername/transaction', async (req, res, next) => {
    try {
        const {body: transaction} = req;
        const {customername: customerName} = req.params;
        let orgToTransactiosTypesMap = orgsToRulesMap.get(customerName.toLowerCase());
        if(!orgToTransactiosTypesMap){
            res.status(404).json({
                message: `Org with name ${customerName} doesnt exist`,
            });
            return
        }
        let typesToPaymentMethodsMap = orgToTransactiosTypesMap.get(transaction.type.toLowerCase());
        if(!typesToPaymentMethodsMap){
            res.status(404).json({
                message: `Type with name ${transaction.type} doesnt exist`,
            });
            return
        }
        const result = typesToPaymentMethodsMap(transaction);
        await fs.writeFile("test.json", JSON.stringify(req.body), function (err) {
            if (err) {
                res.status(404).json({
                    message: 'Failed to parse request',
                    more_info: err,
                });
                return
            }

            res.status(201).send(result);
            return;

        });
    } catch (e) {
        res.status(500).json({
            message: 'Failed to parse request',
            more_info: e.message,
        });
    }
})


app.get('/:customername/balance', (req, res) => {

})


app.listen(port, () => console.log(`Example app listening on port ${port}!`))