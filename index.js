let express = require('express');
let app = express();
var cookieParser = require('cookie-parser');
var session = require('express-session');
let mongoose = require('mongoose');
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(cookieParser());
app.use(session({secret: "1111"}));
//app.use(express.static("C:/Users/DAPL-Asset-224/Desktop/dashboard"));
app.engine('pug', require('pug').__express)
app.set('views','./view');
app.set("view engine",'pug');
//
const MongoClient = require('mongodb').MongoClient
const uri = "mongodb+srv://srbhroy5:hajmola@1@cluster0.nsvaq.mongodb.net/test?retryWrites=true&w=majority";
/*const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
  const collection = client.db("test").collection("devices");
  // perform actions on the collection object
  client.close();
});*/
//
mongoose.connect(uri,{useNewUrlParser:true});
mongoose.connection
        .once("open",()=>
            console.log("MongoDB Connection successfull"))
        .on("error",(error)=>
           console.log("Connection unsuccessfull",error));
let schema = new mongoose.Schema({
    name:String,
    username:String,
    password:String
});
let users = mongoose.model("loginuser",schema,"loginuser");
let dashboardschema = new mongoose.Schema({
    name:String,
    lname:String,
    username:String,
    email:String,
    status:Boolean,
    paddress:String,
    baddress:String,
    fid:[{type: mongoose.Schema.Types.ObjectId, ref: 'addfamily' }]
});
let adduser = mongoose.model("adduser",dashboardschema,"adduser");
let familyschema = new mongoose.Schema({
    uid:{type: mongoose.Schema.Types.ObjectId, ref: 'adduser' },
    fname:String,
    relation:String,
    id_type:String,
    id_number:String
});
let addfamily = mongoose.model("addfamily",familyschema,"addfamily");
function auth(req,res,next) {
    if(req.session.user)
    { console.log("session established");
        next();
    }
    else {
        const err = new Error("Broken link.");
        next(err);
    }
}
function login_auth(req,res,next) {
    if(req.session.user)
    { 
        const err = new Error("Broken link.");
        next(err);
    }
    else {
        next();
    }
}

// app.use('/',login_auth,function(err,req,res,next) {
//     console.log('dash');
//     if(err) {
//         //res.send('Broken link');
//         res.redirect('./dashboard');
//     }
//     //res.redirect('./dashboard');
//     //next();
//     //req.redirect('/dashboard');
//     //next();
// });

app.get('/',login_auth,function(req,res){
    res.render('login');
});

app.post('/',function(req,res){
        users.findOne({"username":req.body.username,"password":req.body.password}, function(err,records) {
            if(err) {
                res.send(err);
            }
            else if(records) {
                req.session.user = records;
                console.log("here");
                console.log(req.session.user);
                res.redirect('/dashboard');
            }
            else {
                console.log(req.body.password);
                console.log(req.body.username);
                res.render('login',{message:"Wrong Credential."});
            }
        });
});
app.use('/dashboard',auth,function(err,req,res,next) {
    console.log('entry');

    if(err) {
    res.send('Broken Link');
    }
    else {
        next();
    }
});

app.get('/dashboard',function(req,res){
    res.render('dashboard',{name:req.session.user.name});
    console.log('dashboard');
});

app.post('/dashboard',function(req,res){
    let userinfo = req.body;
    console.log(userinfo);
    adduser.findOne({$or:[{username:userinfo.username},{email:userinfo.email}]}).exec(function(err,records) {
        if(err) {
            console.log("if error");
            res.render('dashboard',{status:"Error", name:req.session.user.name});
        }
        else {
            if(records) {
                console.log("elseif theres records");
                res.render('dashboard',{status:"Duplicate records", name:req.session.user.name});
            }
            else {
                let newuser = new adduser({
                    name:userinfo.firstname+" "+userinfo.lastname,
                    username:userinfo.username,
                    email:userinfo.email,
                    status:userinfo.status
                });
                console.log("elseelse saving");
                newuser.save(function(err, user){
                    if(err) {
                        console.log("elseelse there no records but err");
                        res.render('dashboard',{status:"Error", name:req.session.user.name});
                    }
                    else {
                        console.log("elseelse there no records and sucesss");
                        res.render('dashboard',{status:"Post Success", new_obj:user, name:req.session.user.name });
                    }
                 });
            }
        }
    });
});
app.get('/pop',function(req,res) {
    adduser.find({_id:"60d7347c4b49b508b855ed4f"}).populate('addfamily','_id').exec(function(err,doc) {
        res.json(doc);
    });
});
app.get('/view',function(req,res) {
    adduser.find({}).exec(function(err,records) {
        if(err) {
            res.render('viewtable',{message : "No records."});
        }
        else {
            res.render('viewtable',{message : records});
        }
    });
    console.log('view');
    
});

app.get('/logout', function(req, res){
    req.session.destroy(function(){
       console.log("user logged out.")
    });
    res.redirect('/');
 });

app.post('/delete',function(req,res) {
    console.log(req.body.id);
    adduser.findByIdAndDelete(req.body.id,function (err, docs) {
        if (err){
            console.log("in alert");
            res.json({status:"Error"});
        }
        else{
            res.redirect("/view");
        }
    });
})

app.get('/edit',function(req,res) {
    adduser.findById(req.query.id,function(err,doc) {
                if(err) {
                    console.log(err);
                }
                else {
                    let obj = doc;
                    addfamily.find({uid:req.query.id},function(err,familydoc) {
                        if(err) {
                            console.log(err);
                        }
                        if(familydoc==null) {
                            obj.family=[];
                        }
                        else {
                            obj.family=familydoc;
                        }
                        //console.log({relation:obj.family})
                        res.render('edituser',{message : obj, relation : obj.family,url:req.query.id});
                    })
                }
                
            });
})

app.post('/update',function(req,res) {
    let basicuser = {
        name:req.body.name,
        email:req.body.email,
        username:req.body.username,
        status:req.body.status,
        paddress:req.body.paddress,
        baddress:req.body.baddress
    };
    // let basicfamily = {
    //     uid:req.body.id,
    //     fname:req.body.fname,
    //     relation:req.body.relation,
    //     id_type:req.body.id_type,
    //     id_number:req.body.id_number
    // }
    console.log(req.body.oldfamily);
    console.log(req.body.newfamily);
    if((req.body.newfamily).length > 0) {
        let ojj = req.body.newfamily;
        addfamily.create(ojj,function(err,docc) {
            if(err) {
                res.json(err);
            }
            else {
                //res.json(docc);
                addfamily.find({uid:req.body.basicfamily.uid},function(err,doc) { //find doc to get _id of doc
                    if(err) {
                        res.json(err)
                    }
                    else {
                        adduser.findByIdAndUpdate(req.body.id, {$push:{fid:{$each:doc._id}}},{"new":true},function(err, docx) {
                            if(err) {
                                res.json(err)
                            }
                            else {
                            console.log("new fm Update Complete");
                            }
                        });
                    }
                })
            }
        }); // add new fmembers
    }
    if((req.body.oldfamily).length > 0) {
        addfamily.findByIdAndUpdate({$in: req.body.oldfamily._id},{
            uid:req.body.oldfamily.uid,
            fname:req.body.oldfamily.fname,
            relation:req.body.oldfamily.relation,
            id_type:req.body.oldfamily.id_type,
            id_number:req.body.oldfamily.id_number
           },{"new":true},function(err,docx) {
               if(err) {
                   res.json(err);
               }
               else {
                    console.log("Old fm Update Complete");
                    res.json({"status":"true"});
               }
           }); // update old member
    }
   

    adduser.findByIdAndUpdate(req.body.id,basicuser,{"new":true},function(err,doc) {
        if(err) {
            res.json({"Status":"Error"});
        }
        else {
            console.log("User details Update Complete");
            res.json({"status":"true"});
                
        }
    }); // Update user details
});
app.listen(process.env.PORT || 8080);
