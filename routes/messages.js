var express = require('express');
var router = express.Router();
const User = require('../models/users');
const Message = require('../models/messages');
const { checkBody } = require('../modules/checkBody.js');

router.post('/send', async (req, res) =>{
    // token verification
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }
  const user = await User.findOne({ token: token });
  if (!user) {
    return res.status(401).json({ message: 'Token invalide' });
  }

  const receiveUser = await User.findOne({ username: req.body.receiveUser})
  if (!receiveUser) {
    return res.status(401).json({ message: 'Utilisateur invalide' });
  }

  const newMessage = new Message({
    send_user: user._id,
    receive_user: receiveUser._id,
    message: req.body.message,
    date: new Date(),
    vu: false,
  })
  .save().then(data=>(
      res.json({result: true, message: data})
    )).catch((err)=>{
        res.json({result: false, error:err, message: "problème envoie du message"})
    })
})

router.get('/', async (req,res)=>{
    // token verification
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }
  const user = await User.findOne({ token: token });
  if (!user) {
    return res.status(401).json({ message: 'Token invalide' });
  }
  
  try{
  const aggrResult = await Message.aggregate([
    {
      $match: {
        $or: [
          {
            $or: [
              {
                send_user: user._id,
              },
            ],
          },
          {
            $or: [
              {
                receive_user: user._id
                ,
              },
            ],
          },
        ],
      },
    },
    {
      $group: {
        _id: {
          send_user: {
            $cond: [
              {
                $gt: [
                  "$send_user",
                  "$receive_user",
                ],
              },
              "$send_user",
              "$receive_user",
            ],
          },
          receive_user: {
            $cond: [
              {
                $gt: [
                  "$send_user",
                  "$receive_user",
                ],
              },
              "$receive_user",
              "$send_user",
            ],
          },
        },
        messages: {
          $push: "$$ROOT",
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id.send_user",
        foreignField: "_id",
        as: "send_user",
      },
    },
    {
      $unwind: "$send_user",
    },
    {
      $lookup: {
        from: "profils",
        localField: "send_user.profil_id",
        foreignField: "_id",
        as: "send_user.profil",
      },
    },
    {
      $unwind: "$send_user.profil",
    },
    {
      $lookup: {
        from: "users",
        localField: "_id.receive_user",
        foreignField: "_id",
        as: "receive_user",
      },
    },
    {
      $unwind: "$receive_user",
    },
    {
      $lookup: {
        from: "profils",
        localField: "receive_user.profil_id",
        foreignField: "_id",
        as: "receive_user.profil",
      },
    },
    {
      $unwind: "$receive_user.profil",
    },
    {
      $project: {
        _id: 0,
        messages: {
          $map: {
            input: "$messages",
            as: "msg",
            in: {
              id:"$$msg._id",
              message: "$$msg.message",
              date: "$$msg.date",
              vu: "$$msg.vu",
              send_user: {
                $cond: {
                  if: {
                    $eq: [
                      "$$msg.send_user",
                      "$_id.send_user",
                    ],
                  },
                  then: {
                    _id: "$send_user._id",
                    username: "$send_user.username",
                    avatar:
                      "$send_user.profil.avatar",
                  },
                  else: {
                    _id: "$receive_user._id",
                    username:
                      "$receive_user.username",
                    avatar:
                      "$receive_user.profil.avatar",
                  },
                },
              },
              receive_user: {
                $cond: {
                  if: {
                    $eq: [
                      "$$msg.receive_user",
                      "$_id.receive_user",
                    ],
                  },
                  then: {
                    _id: "$receive_user._id",
                    username:
                      "$receive_user.username",
                    avatar:
                      "$receive_user.profil.avatar",
                  },
                  else: {
                    _id: "$send_user._id",
                    username: "$send_user.username",
                    avatar:
                      "$send_user.profil.avatar",
                  },
                },
              },
            },
          },
        },
      },
    },
  ]);
    res.json({ result: true, messages: aggrResult });

  } catch (err) {
    res.status(500).json({ result: false, error: err.message });
  }
})

router.post('/vu', async (req, res)=>{
   // token verification
   const token = req.headers['authorization'];
   if (!token) {
     return res.status(401).json({ message: 'Token manquant' });
   }
   const user = await User.findOne({ token: token });
   if (!user) {
     return res.status(401).json({ message: 'Token invalide' });
   }
   const message = await Message.findOne({_id : req.body._id})
   message.vu = true

   try {
    await message.save();
    res.json({result: true});
  } catch (err) {
    const errorResponse = { result: false, message: err.message };
    res.status(500).json(errorResponse);
  }
})

module.exports = router;