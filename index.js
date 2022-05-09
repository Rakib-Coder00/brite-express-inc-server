const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000


const app = express()


//Middleware =>
app.use(cors())
app.use(express.json())

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).json({ error: 'No token, authorization denied' })
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Token is not valid' })
        }
        req.decoded = decoded

        console.log('decoded', decoded)
    })

    // console.log('jwt verify', authHeader);
    next()
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mwhxt.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db('briteExpress').collection('services')
        const itemCollection = client.db('briteExpress').collection('items')

        //Auth  =>
        app.post('/login', async (req, res) => {
            const user = req.body
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' })
            res.send({ accessToken })
        })

        //Services API
        app.get('/service', async (req, res) => {
            const query = {}
            const cursor = serviceCollection.find(query)
            const services = await cursor.toArray()
            res.send(services)
        })
        app.get('/service/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const service = await serviceCollection.findOne(query)
            res.send(service)
        })


        // add items to the database =>
        app.post('/service', async (req, res) => {
            const newItem = req.body
            const result = await serviceCollection.insertOne(newItem)
            res.json(result)
        })

        // update items in the database =>
        app.put('/service/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            // const restockQuantity = req.body
            // const item = await serviceCollection.findOne(query);
            // const newQuantity = parseInt(item.quantity) + parseInt(req.body.quantity);
            const newQuantity = req.body.quantity
            const newSold = req.body.sold
            const update = { $set: { quantity: newQuantity + "", sold: newSold + "" } }
            const option = { upsert: true }
            const result = await serviceCollection.updateOne(query, update, option)
            res.json(result)
        })

        //Delete items from the database =>
        app.delete('/service/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await serviceCollection.deleteOne(query)
            res.json(result)
        })

        // myItems collection API =>
        // app.get('/items', async (req, res) => {
        //     const email = req.query.email
        //     const query = {email: email}
        //     const cursor = serviceCollection.find(query)
        //     const services = await cursor.toArray()
        //     res.send(services)
        // })
        app.get('/items', verifyJWT, async (req, res) => {
            // const authHeader = req.headers.authorization
            const decodedEmail = req.decoded.email
            const email = req.query.email
            // console.log(email);
            if (email === decodedEmail) {
                const query = { email: email }
                const cursor = serviceCollection.find(query)
                const order = await cursor.toArray()
                res.send(order)
            }
            else {
                res.status(403).json({ error: 'You are not authorized to view this page' })
            }
        })
    }
    finally {

    }
}
run().catch(console.dir)



app.get('/', (req, res) => {
    res.send('Brite Express Server Running...✔')
})
app.listen(port, () => {
    console.log('Listening to port', port);
})