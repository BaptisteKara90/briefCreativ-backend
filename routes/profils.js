var express = require('express');
var router = express.Router();
const User = require('../models/users');
const Profil = require('../models/profils');
const { checkBody } = require('../modules/checkBody.js');
const uid2 = require('uid2');
const bcrypt = require('bcrypt');
const uniqid = require('uniqid');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

router.get('/', async (req,res)=>{
    // check if token
    const token = req.headers['authorization'];
    if (!token) {
      return res.status(401).json({ message: 'Token manquant' });
    }
  
    // find user by token
    const user = await User.findOne({ token: token });
    if (!user) {
      return res.status(401).json({ message: 'Token invalide' });
    }
    console.log(user)

    const profil = await Profil.findOne({user_id: user._id});
    if (!profil) {
      return res.status(401).json({ result: false, message: 'profile introuvable' });
    }else{
      return res.status(200).json({result: true, profil: profil})
    }
  })

router.put('/', async (req, res)=>{
     // check if token
     const token = req.headers['authorization'];
     if (!token) {
       return res.status(401).json({ message: 'Token manquant' });
     }
   
     // find user by token
     const user = await User.findOne({ token: token });
     if (!user) {
       return res.status(401).json({ message: 'Token invalide' });
    }

    //find profil by user ID
    const profil = await Profil.findOne({user_id: user._id});
    if (!profil) {
      return res.status(401).json({ result: false, message: 'profile introuvable' });
    }else{

      // check what the user wants to update
      if (req.body.bio !== undefined) {
        const bio = req.body.bio.replace(/(\r\n|\r|\n)/g, "\n");
        console.log(bio)
        profil.bio = bio;
      }
      if (req.body.avatar !== undefined) {
        profil.avatar = req.body.avatar;
      }
      if (req.body.facebook !== undefined) {
        profil.reseaux.facebook = req.body.facebook;
      }
      if (req.body.linkedin !== undefined) {
        profil.reseaux.linkedin = req.body.linkedin;
      }
      if (req.body.twitter !== undefined) {
        profil.reseaux.twitter = req.body.twitter;
      }
      if (req.body.instagram !== undefined) {
        profil.reseaux.instagram = req.body.instagram;
      }
      // save changes in db
      try {
        await profil.save();
        const response = { result: true, message: 'Profil mis à jour avec succès', profil: profil };
        res.json(response);
      } catch (err) {
        const errorResponse = { result: false, message: err.message };
        res.status(500).json(errorResponse);
      }
    }
})  

router.post('/avatar', async (req,res)=>{
  // check if token
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  // find user by token
  const user = await User.findOne({ token: token });
  if (!user) {
    return res.status(401).json({ message: 'Token invalide' });
  }

 //find profil by user ID
 const profil = await Profil.findOne({user_id: user._id});
 if (!profil) {
   return res.status(401).json({ result: false, message: 'profile introuvable' });
 }else{
  const photoPath = `./tmp/${uniqid()}.jpg`;
  const resultMove = await req.files.avatar.mv(photoPath);

  if (!resultMove) {
    const resultCloudinary = await cloudinary.uploader.upload(photoPath);
    fs.unlinkSync(photoPath);
    return res.json({ result: true, url: resultCloudinary.secure_url });
  }else{
    return res.json({result: false, error: resultMove});
  }
 }
  
})

module.exports = router;