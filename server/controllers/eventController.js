const Event=require('../models/event');
const Booking = require('../models/booking');

const makeTeam = (booking) => ({
    bookingId: booking._id,
    name: booking.teamName || booking.userId?.name || booking.userId?.email || `Team ${booking._id.toString().slice(-4)}`
});

const nextPowerOfTwo = (value) => {
    let power = 1;
    while (power < value) power *= 2;
    return power;
};

const getKnockoutRoundLabel = (matchCount) => {
    if (matchCount <= 1) return 'Final';
    if (matchCount === 2) return 'Semi Final';
    if (matchCount === 4) return 'Quarter Final';
    return `Round of ${matchCount * 2}`;
};

const buildKnockoutMatches = (participants) => {
    const bracketSize = nextPowerOfTwo(participants.length);
    const seeded = [...participants];
    while (seeded.length < bracketSize) {
        seeded.push(null);
    }

    const rounds = [];
    let currentSize = bracketSize / 2;
    let roundNumber = 1;

    while (currentSize >= 1) {
        const roundLabel = getKnockoutRoundLabel(currentSize);
        const matches = [];
        for (let i = 0; i < currentSize; i++) {
            matches.push({
                matchId: `R${roundNumber}-M${i + 1}`,
                round: roundNumber,
                roundLabel,
                bracketIndex: i,
                teamA: roundNumber === 1 ? seeded[i * 2] : null,
                teamB: roundNumber === 1 ? seeded[i * 2 + 1] : null,
                winnerBookingId: null,
                status: 'pending',
                nextMatchId: null,
                nextSlot: null,
            });
        }
        rounds.push(matches);
        currentSize = currentSize / 2;
        roundNumber += 1;
    }

    for (let i = 0; i < rounds.length - 1; i++) {
        for (const match of rounds[i]) {
            const nextMatch = rounds[i + 1][Math.floor(match.bracketIndex / 2)];
            match.nextMatchId = nextMatch.matchId;
            match.nextSlot = match.bracketIndex % 2 === 0 ? 'teamA' : 'teamB';
        }
    }

    for (const match of rounds[0]) {
        if (match.teamA && !match.teamB) {
            match.winnerBookingId = match.teamA.bookingId;
            match.status = 'completed';
        } else if (!match.teamA && match.teamB) {
            match.winnerBookingId = match.teamB.bookingId;
            match.status = 'completed';
        }
    }

    const allMatches = rounds.flat();
    const byId = Object.fromEntries(allMatches.map((match) => [match.matchId, match]));

    for (const match of allMatches.filter((entry) => entry.status === 'completed' && entry.nextMatchId && entry.winnerBookingId)) {
        const winnerTeam = match.teamA?.bookingId?.toString() === match.winnerBookingId.toString() ? match.teamA : match.teamB;
        if (!winnerTeam) continue;
        const nextMatch = byId[match.nextMatchId];
        if (nextMatch) nextMatch[match.nextSlot] = winnerTeam;
    }

    return allMatches;
};

const buildLeagueMatches = (participants) => {
    const teams = [...participants];
    const hasBye = teams.length % 2 === 1;
    if (hasBye) teams.push(null);

    const rounds = teams.length - 1;
    const half = teams.length / 2;
    const rotation = [...teams];
    const matches = [];

    for (let round = 0; round < rounds; round++) {
        for (let i = 0; i < half; i++) {
            const home = rotation[i];
            const away = rotation[rotation.length - 1 - i];
            if (home && away) {
                matches.push({
                    matchId: `L${round + 1}-M${i + 1}`,
                    round: round + 1,
                    roundLabel: `Matchday ${round + 1}`,
                    bracketIndex: i,
                    teamA: round % 2 === 0 ? home : away,
                    teamB: round % 2 === 0 ? away : home,
                    winnerBookingId: null,
                    status: 'pending',
                    nextMatchId: null,
                    nextSlot: null,
                });
            }
        }

        const fixed = rotation[0];
        const rest = rotation.slice(1);
        rest.unshift(rest.pop());
        rotation.splice(0, rotation.length, fixed, ...rest);
    }

    return matches;
};

const calculateLeagueStandings = (tournament) => {
    const table = new Map();

    for (const team of tournament.participants || []) {
        table.set(team.bookingId.toString(), {
            bookingId: team.bookingId,
            name: team.name,
            played: 0,
            won: 0,
            lost: 0,
            points: 0,
        });
    }

    for (const match of tournament.matches || []) {
        if (!match.matchId.startsWith('L') || match.status !== 'completed' || !match.teamA || !match.teamB || !match.winnerBookingId) {
            continue;
        }

        const teamAId = match.teamA.bookingId.toString();
        const teamBId = match.teamB.bookingId.toString();
        const winnerId = match.winnerBookingId.toString();
        const loserId = winnerId === teamAId ? teamBId : teamAId;

        const winner = table.get(winnerId);
        const loser = table.get(loserId);

        if (!winner || !loser) continue;

        winner.played += 1;
        winner.won += 1;
        winner.points += 2;
        loser.played += 1;
        loser.lost += 1;
    }

    return [...table.values()].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.won !== a.won) return b.won - a.won;
        return a.name.localeCompare(b.name);
    }).map((entry, index) => ({ ...entry, rank: index + 1 }));
};

exports.getEvents=async(req,res)=>{
    try{
        const filters={};
        if(req.query.category){
            filters.category=req.query.category;
        }
        if(req.query.location){
            const escapedLocation = req.query.location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filters.$or = [
                { location: { $regex: escapedLocation, $options: 'i' } },
                { title: { $regex: escapedLocation, $options: 'i' } }
            ];
        }

        const events=await Event.find(filters).sort({ date: 1, createdAt: -1 });
        res.json(events);
    }
    catch(err){
        console.error(err);
        res.status(500).json({message:'Server error'});
    }
};

exports.getEventById=async(req,res)=>{
    try{
        const event=await Event.findById(req.params.id);
        if(!event){
            return res.status(404).json({message:'Event not found'});
        }
        res.json(event);
    }
    catch(err){
        console.error(err);
        res.status(500).json({message:'Server error'});
    }
};

exports.createEvent=async(req,res)=>{
    const {
        title,
        description,
        date,
        time,
        location,
        category,
        totalSeats,
        availableSeats,
        price,
        imageUrl
    }=req.body;
    try{
        const event=await Event.create({
            title,
            description,
            date,
            time,
            location,
            category,
            totalSeats,
            availableSeats: availableSeats ?? totalSeats,
            price,
            imageUrl,
            createdBy: req.user._id
        });
        res.status(201).json(event);
    }
    catch(err){
        console.error(err);
        res.status(500).json({message:'Server error'});
    }
};

exports.updateEvent=async(req,res)=>{
    const {title,description,date,time,location,category,totalSeats,availableSeats,price,imageUrl}=req.body;
    try{
        const event=await Event.findByIdAndUpdate(
            req.params.id,
            {title,description,date,time,location,category,totalSeats,availableSeats,price,imageUrl},
            {new:true}
        );
        if(!event){
            return res.status(404).json({message:'Event not found'});
        }
        res.json(event);
    }
    catch(err){
        console.error(err);
        res.status(500).json({message:'Server error'});
    }
};

exports.deleteEvent=async(req,res)=>{
    try{
        const event=await Event.findByIdAndDelete(req.params.id);
        if(!event){
            return res.status(404).json({message:'Event not found'});
        }
        res.json({message:'Event deleted successfully'});
    }
    catch(err){
        console.error(err);
        res.status(500).json({message:'Server error'});
    }
};

exports.generateTournament = async (req, res) => {
    const { format } = req.body;

    if (!['knockout', 'league'].includes(format)) {
        return res.status(400).json({ message: 'Tournament format must be knockout or league' });
    }

    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.category !== 'Sports') {
            return res.status(400).json({ message: 'Tournament manager is only available for sports events' });
        }

        const bookings = await Booking.find({
            eventId: event._id,
            status: 'confirmed'
        }).populate('userId', 'name email');

        if (bookings.length < 2) {
            return res.status(400).json({ message: 'At least two confirmed teams are required' });
        }

        if (bookings.length < event.totalSeats) {
            return res.status(400).json({ message: 'Tournament can be generated after all team slots are confirmed' });
        }

        const participants = bookings.map(makeTeam);
        const matches = format === 'knockout'
            ? buildKnockoutMatches(participants)
            : buildLeagueMatches(participants);

        event.tournament = {
            enabled: true,
            format,
            status: matches.every((match) => match.status === 'completed') ? 'completed' : 'generated',
            participants,
            matches,
            generatedAt: new Date(),
        };

        await event.save();
        res.json({ message: 'Tournament generated', tournament: event.tournament });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.recordMatchResult = async (req, res) => {
    const { winnerBookingId } = req.body;

    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (!event.tournament?.enabled) {
            return res.status(400).json({ message: 'Tournament has not been generated yet' });
        }

        const match = event.tournament.matches.find((entry) => entry.matchId === req.params.matchId);
        if (!match) {
            return res.status(404).json({ message: 'Match not found' });
        }

        const validTeamIds = [match.teamA?.bookingId?.toString(), match.teamB?.bookingId?.toString()].filter(Boolean);
        if (!validTeamIds.includes(winnerBookingId)) {
            return res.status(400).json({ message: 'Winner must be one of the scheduled teams' });
        }

        match.winnerBookingId = winnerBookingId;
        match.status = 'completed';

        if (match.nextMatchId && match.nextSlot) {
            const nextMatch = event.tournament.matches.find((entry) => entry.matchId === match.nextMatchId);
            const winnerTeam = match.teamA?.bookingId?.toString() === winnerBookingId ? match.teamA : match.teamB;
            if (nextMatch && winnerTeam) {
                nextMatch[match.nextSlot] = winnerTeam;
            }
        }

        const allCompleted = event.tournament.matches.every((entry) => entry.status === 'completed');
        event.tournament.status = allCompleted ? 'completed' : 'generated';

        await event.save();
        res.json({ message: 'Match result saved', tournament: event.tournament });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.generateLeagueKnockouts = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (!event.tournament?.enabled || event.tournament.format !== 'league') {
            return res.status(400).json({ message: 'Generate league fixtures before creating knockouts' });
        }

        const standings = calculateLeagueStandings(event.tournament);
        const qualified = standings.filter((team) => team.played > 0).slice(0, 4);

        if (qualified.length < 4) {
            return res.status(400).json({ message: 'At least four teams with league results are required' });
        }

        const toTeam = (standing) => ({
            bookingId: standing.bookingId,
            name: standing.name
        });

        event.tournament.matches = event.tournament.matches.filter((match) => !match.matchId.startsWith('P'));
        event.tournament.matches.push(
            {
                matchId: 'P1',
                round: 100,
                roundLabel: 'Semi Final 1',
                bracketIndex: 0,
                teamA: toTeam(qualified[0]),
                teamB: toTeam(qualified[3]),
                winnerBookingId: null,
                status: 'pending',
                nextMatchId: 'PF',
                nextSlot: 'teamA',
            },
            {
                matchId: 'P2',
                round: 100,
                roundLabel: 'Semi Final 2',
                bracketIndex: 1,
                teamA: toTeam(qualified[1]),
                teamB: toTeam(qualified[2]),
                winnerBookingId: null,
                status: 'pending',
                nextMatchId: 'PF',
                nextSlot: 'teamB',
            },
            {
                matchId: 'PF',
                round: 101,
                roundLabel: 'Final',
                bracketIndex: 0,
                teamA: null,
                teamB: null,
                winnerBookingId: null,
                status: 'pending',
                nextMatchId: null,
                nextSlot: null,
            }
        );

        event.tournament.status = 'generated';
        await event.save();

        res.json({ message: 'League knockouts generated', tournament: event.tournament, standings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
