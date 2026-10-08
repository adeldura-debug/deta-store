require('dotenv').config();
const path=require('path'); const express=require('express'); const mongoose=require('mongoose'); const cors=require('cors'); const helmet=require('helmet'); const rateLimit=require('express-rate-limit');
const app=express();
app.use(helmet({contentSecurityPolicy:false})); app.use(cors({origin:process.env.CLIENT_URL||true})); app.use(express.json({limit:'2mb'})); app.use(express.urlencoded({extended:true,limit:'5mb'})); app.use('/uploads',express.static(path.join(__dirname,'uploads'))); app.use(express.static(path.join(__dirname,'public')));
app.use('/api/auth',require('./routes/auth')); app.use('/api/products',require('./routes/products')); app.use('/api/orders',require('./routes/orders')); app.use('/api/print',require('./routes/print')); app.use('/api/brand',require('./routes/brand')); app.use('/api/coupons',require('./routes/coupons'));
app.use('/api/uploads',require('./routes/uploads'));
app.get('/api/health',(req,res)=>res.json({ok:true,service:'DETA'})); app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
const port=process.env.PORT||3000; mongoose.connect(process.env.MONGODB_URI).then(()=>app.listen(port,()=>console.log(`DETA running on http://localhost:${port}`))).catch(err=>{console.error('MongoDB connection failed:',err.message);process.exit(1)});
