const express=require('express');
const router=express.Router();
const {protect,admin}=require('../middlewares/auth');
const {
    createEvent,
    getEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    generateTournament,
    generateLeagueKnockouts,
    recordMatchResult
}=require('../controllers/eventController');

//get all events
router.get('/',getEvents);
//get event by id
router.get('/:id',getEventById);
//create, update, delete events (admin only)
router.post('/',protect,admin,createEvent);
router.put('/:id',protect,admin,updateEvent);
router.delete('/:id',protect,admin,deleteEvent);
router.post('/:id/tournament/generate', protect, admin, generateTournament);
router.post('/:id/tournament/league-knockouts', protect, admin, generateLeagueKnockouts);
router.put('/:id/tournament/matches/:matchId/result', protect, admin, recordMatchResult);

module.exports=router;
