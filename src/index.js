const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const port = 3000;


const applyRuleAndGenerateResult = (calculation) => {
    return transaction => {
        const {commission, vat} = calculation(transaction);
        return {
            ...transaction,
            commission,
            vat
        };
    };
}

function smallPartnersPayNow() {
    return applyRuleAndGenerateResult(transaction => {
        const {amount} = transaction;
        const commission = amount > 1100 ?
            amount / 100 * 7 :
            amount / 100 * 5;
        return {
            commission,
            vat: 0
        }
    })
}

function smallPartnersPayWithInstallments() {
    return applyRuleAndGenerateResult(transaction => {
        const {amount} = transaction;
        let commission = 0;
        let vat = 0;
        if (amount > 1000) {
            vat = amount * 7 / 100;
        } else if (amount > 500) {
            commission = amount * 6 / 100;
        } else {
            commission = amount * 8 / 100;
        }
        return {
            commission,
            vat
        }
    })
}

function smallPartnersRefundPayment() {
    return applyRuleAndGenerateResult(transaction => {
        const commission = transaction.amount > 1100 ?
            transaction.amount / 100 * 7 :
            transaction.amount / 100 * 5;
        return {
            commission,
            vat: 0
        }
    })
}


function NikePayWithInstallments() {
    return applyRuleAndGenerateResult(transaction => {
        return {
            commission: Math.max(10, transaction.amount / 100 * 4),
            vat: 0
        }
    });
}

function NikePayNow() {
    return applyRuleAndGenerateResult(transaction => {
        let commission = Math.min(12, transaction.amount / 100 * 3);
        return {
            commission,
            vat: 0
        }
    });
}


function HNMPayNow() {
    return applyRuleAndGenerateResult(transaction => {
        let commission = Math.min(100, transaction.amount / 100 * 2);
        return {
            commission,
            vat: 0
        }
    });
}

function HNMPayWithInstallments() {
    return applyRuleAndGenerateResult(transaction => {
        let commission = Math.min(100, transaction.amount / 100 * 2);
        return {
            commission,
            vat: 0
        }
    });
}


function OlivePayNow() {
    return applyRuleAndGenerateResult(transaction => {
        let commission = Math.max(8, transaction.amount / 100 * 4);
        return {
            commission,
            vat: 0
        }
    });
}

function OlivePayWithInstallments() {
    return applyRuleAndGenerateResult(transaction => {
        return {
            commission: transaction.amount > 1100 ? transaction.amount / 100 * 4 : 0,
            vat: transaction.amount / 100 * 7
        }
    });
}

function smallPartnersRefund() {
    return applyRuleAndGenerateResult(transaction => {
        return {
            commission: transaction.amount / 100,
            vat: 0
        }
    });
}


let smallPartnersMap = new Map([
    ['Pay now'.toLowerCase(), (smallPartnersPayNow())],
    ['Pay with Installments'.toLowerCase(), (smallPartnersPayWithInstallments())],
    ['Refund'.toLowerCase(), (smallPartnersRefund())],
]);
const emptyResult = () => {
    return (transaction) => {
        return {
            ...transaction,
            commission: 0,
            vat: 0
        }
    }
}
const orgsToRulesMap = new Map([
    [
        'Nike'.toLowerCase(), new Map([
        ['Pay now'.toLowerCase(), (NikePayNow())],
        ['Pay with Installments'.toLowerCase(), (NikePayWithInstallments())],
        ['Refund'.toLowerCase(), emptyResult()],
    ]),
        'H&M'.toLowerCase(), new Map(
        [
            ['Pay now', (HNMPayNow())],
            ['Pay with Installments', (HNMPayWithInstallments())],
            ['Refund', emptyResult()],
        ]),
        'Olive'.toLowerCase(), new Map(
        [
            ['Pay now', (OlivePayNow())],
            ['Pay with Installments', (OlivePayWithInstallments())],
            ['Refund', () => emptyResult()],
        ]),
        'David bigud'.toLowerCase(), smallPartnersMap,
        'Moshe halbasha'.toLowerCase(), smallPartnersMap,
        'Tamar bgadim'.toLowerCase(), smallPartnersMap,
        'Michal Ofna'.toLowerCase(), smallPartnersMap,

    ]
]);


app.use(bodyParser.json());

async function writeToFile(transaction) {
    let text = fs.readFileSync('data.json', 'utf8') || '{}';
    if (!text) {
        fs.appendFileSync("data.json", text);
    }
    const data = JSON.parse(text);
    data[transaction.customerName] = data[transaction.customerName] || [];
    data[transaction.customerName].push(transaction)
    fs.writeFileSync("data.json", JSON.stringify(data));
}

function applyWeekendDiscount(transaction) {
    if (new Date(transaction.date).getDay() > 4) {
        transaction.commission += transaction.amount / 200 * -1;
    }
}

app.post('/:customername/transaction', async (req, res, next) => {
    try {
        const {body: transaction} = req;
        if(transaction.type.toLowerCase() === 'refund'){
            transaction.amount = -1 * Math.abs(transaction.amount);
        }
        const {customername: customerName} = req.params;
        let orgToTransactiosTypesMap = orgsToRulesMap.get(customerName.toLowerCase());
        if (!orgToTransactiosTypesMap) {
            res.status(404).json({
                message: `Org with name ${customerName} doesnt exist`,
            });
            return
        }
        let typesToPaymentMethodsMap = orgToTransactiosTypesMap.get(transaction.type.toLowerCase());
        if (!typesToPaymentMethodsMap) {
            res.status(404).json({
                message: `Type with name ${transaction.type} doesnt exist`,
            });
            return
        }
        const result = typesToPaymentMethodsMap(transaction);
        applyWeekendDiscount(transaction);
        result.customerName = customerName;
        result.reportToIRS = result.amount > 2000;
        await writeToFile(result);
        res.status(201).send(result);
    } catch (e) {
        res.status(500).json({
            message: 'Failed to parse request',
            more_info: e.message,
        });
    }
})


app.get('/:customername/balance', (req, res) => {
    try {
        const {customername: customerName} = req.params;
        let text = fs.readFileSync('data.json', 'utf8') || '{}';
        if (!text) {
            fs.appendFileSync("data.json", text);
        }
        const data = JSON.parse(text);
        const result = data[customerName].reduce((acc, current) => {
            return acc + current.amount + current.commission + current.vat;
        }, 0);
        res.status(200).send({
            result
        });
    } catch (e) {
        res.status(500).json({
            message: 'Failed to parse request',
            more_info: e.message,
        });
    }
})


app.listen(port, () => console.log(`Example app listening on port ${port}!`))