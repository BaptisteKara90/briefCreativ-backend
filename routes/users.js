var express = require('express');
var router = express.Router();
const User = require('../models/users');
const Profil = require('../models/profils');
const Creation = require('../models/creations')
const { checkBody } = require('../modules/checkBody.js');
const uid2 = require('uid2');
const bcrypt = require('bcrypt');
const { default: mongoose } = require('mongoose');



router.post('/signup', (req, res) => {
  if (!checkBody(req.body, ['username', 'password', 'email'])) {
    res.json({ result: false, error: 'Champs vide ou manquant' });
    return;
  }
 
  // Check if the user has not already been registered
  User.findOne({ $or: [{ username: req.body.username }, { email: req.body.email }] }).then(data => {
    if (data === null) {
      const hash = bcrypt.hashSync(req.body.password, 10);
 
      const newUser = new User({
        username: req.body.username,
        email: req.body.email,
        password: hash,
        token: uid2(32),
      });
 
      newUser.save().then(newUserDoc => { 

        // Création du profile
        const newProfil = new Profil({
          avatar: null,
          bio: null,
          reseaux: {facebook: null, linkedin: null, twitter: null, instagram: null},
          user_id: newUserDoc._id,
        });
        newProfil.save().then((newProfilDoc)=>{
          newUserDoc.profil_id = newProfilDoc;
          newUserDoc.save().then(()=>{
            res.json({ result: true, _id: newUserDoc._id, email: newUserDoc.email, token: newUserDoc.token, followed: newUserDoc.followed });
          });
        }).catch((err) => {
          console.error(err);
          res.json({ result: false, error: "Erreur lors de la création du profil" });
        });
      });
    } else {
      // User already exists in database
      res.json({ result: false, error: "L'utilisateur existe déjà" });
    }
  });
 });
 
 router.post('/signin', (req, res) => {
    if (!checkBody(req.body, ['email', 'password'])) {
      res.json({ result: false, error: 'Champs vide ou manquant' });
      return;
    }
  
    User.findOne({ email: req.body.email }).then(data => {
      if (data && bcrypt.compareSync(req.body.password, data.password)) {
        res.json({ result: true, _id: data._id, username: data.username, email:data.email, token: data.token, followed: data.followed });
      } else {
        res.json({ result: false, error: 'Mot de Passe incorrect' });
      }
    });
  })


  router.put('/profile', async (req, res) => {
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
  
    // check what the user wants to update
    if (req.body.username !== undefined) {
      const searchUserName = await User.findOne({username: req.body.username});
      if (!searchUserName) {
        user.username = req.body.username;
      }else{
        return res.status(401).json({result: false, message: 'username déjà existant' });
      }
    }
    if (req.body.email !== undefined) {
      const searchEmail = await User.findOne({email: req.body.email})
      if (!searchEmail) {
        if (bcrypt.compareSync(req.body.password, user.password)) {
          user.email = req.body.email;
       }else{
        return res.status(401).json({result: false, message: "mot de passe incorrect"})
       }
      }else{
        return res.status(401).json({result: false, message: 'email déjà existant' });
      }
      
    }
    if (req.body.newPassword !== undefined) {
      if (bcrypt.compareSync(req.body.password, user.password)) {
        const hash = bcrypt.hashSync(req.body.newPassword, 10);
        user.password = hash;
      }else{
        return res.status(401).json({result: false, message: "mot de passe incorrect"})
      }
    }
  
    // save changes in db
    try {
      await user.save();
      res.json({ result: true, message: 'Profil mis à jour avec succès' });
    } catch (err) {
      res.status(500).json({result: false, message: err.message });
    }
  });
  

  router.get('/search/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: { $regex: req.params.username, $options: 'i' } }).populate('profil_id')
        .then((data)=>{
           if (data.username) {
            res.json({result : true, user: {token: data.token, email: data.email, username: data.username, followed: data.followed, profil_id: data.profile_id, date: data.date, admin: data.admin}});
        } else {
            res.json({ result: false , message: 'Utilisateur non trouvé' });
        }
        })
       
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

//handle follows 

router.put('/follow', async (req, res) => {
  const { followerId, followedId } = req.body;

  if (!followerId || !followedId) {
    return res.status(400).json({ error: 'Both followerId and followedId are required' });
  }

  try {
    // Update the follower
    const follower = await User.findById(followerId);
    if (!follower.followed.includes(followedId)) {
      follower.followed.push(followedId);
      await follower.save();
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//handle unfollows 

router.put('/unfollow', async (req, res) => {
  const { followerId, followedId } = req.body;

  if (!followerId || !followedId) {
    return res.status(400).json({ error: 'Both followerId and followedId are required' });
  }

  try {
    // Update the follower
    const follower = await User.findById(followerId);
    if (follower.followed.includes(followedId)) {
      follower.followed = follower.followed.filter(id => id !== followedId);
      await follower.save();
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//Check if user if following other user.
router.get('/following/:userId/:profileId', async (req, res) => {
  try {
    const { userId, profileId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const isFollowing = user.followed.includes(profileId);
    res.json({ isFollowing });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

//Delete an user

router.delete('/delete', async (req, res) => {
  try {
    // Vérifiez si le token est présent dans les en-têtes de la requête
    const token = req.headers['authorization'];
    if (!token) {
      return res.status(401).json({ message: 'Token manquant' });
    }
  
    // Recherchez l'utilisateur correspondant au token
    const user = await User.findOne({ token: token });
    if (!user) {
      return res.status(401).json({ message: 'Token invalide' });
    }
    
    if (!bcrypt.compareSync(req.body.password, user.password)) {
      return res.status(401).json({result: false})
   }else{
     // Définissez les noms de toutes vos collections
    const collectionNames = ['briefs', 'creations', 'profils', 'messages', 'users'];

    // Supprimez les likes de l'utilisateur dans les commentaires
    await Creation.updateMany(
      {}, // Récuperer toutes les créations
      { $pull: { 'commentaires.$[].like': user._id } }, // Recherche dans le tableau like des commentaires l'userID
      { multi: true }
    );
    // Supprimez les commentaires de l'utilisateur dans toutes les créations
    await Creation.updateMany(
      { 'commentaires.user_id': user._id },
      { $pull: { commentaires: { user_id: user._id } } }
    );

    // Supprimez les likes de l'utilisateur dans toutes les créations
        await Creation.updateMany(
          { 'like': user._id },
          { $pull: { like: user._id } }
        );

        // Supprimez les followed de l'utilisateur sur tout les utilisateurs
    await User.updateMany(
      { 'followed': user._id },
      { $pull: { followed: user._id } }
    );

    const deletionResults = [];
    // Parcourez toutes les collections
    for (const collectionName of collectionNames) {
      const model = mongoose.model(collectionName);
      
      // Supprimez l'utilisateur de la collection actuelle en recherchant son id dans les différentes keys
      const deletionResult = await model.deleteMany({
        $or: [
          { user_id: user.id },
          { autor: user.id },
          { send_user: user.id },
          { receive_user: user.id },
          { _id: user.id}
        ]
      });
      deletionResults.push({ collection: collectionName, result: deletionResult });
    }

    res.json({ result: true, deletionResults });
  }
   } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la suppression.'});
  }
});
  
module.exports = router;
