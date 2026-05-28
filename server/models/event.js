const mongoose = require('mongoose');

const tournamentTeamSchema = new mongoose.Schema({
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
}, { _id: false });

const tournamentMatchSchema = new mongoose.Schema({
        matchId: {
            type: String,
            required: true,
        },
        round: {
            type: Number,
            required: true,
        },
        roundLabel: {
            type: String,
            required: true,
        },
        bracketIndex: {
            type: Number,
            required: true,
        },
        teamA: {
            type: tournamentTeamSchema,
            default: null,
        },
        teamB: {
            type: tournamentTeamSchema,
            default: null,
        },
        winnerBookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
            default: null,
        },
        status: {
            type: String,
            enum: ['pending', 'completed'],
            default: 'pending',
        },
        nextMatchId: {
            type: String,
            default: null,
        },
        nextSlot: {
            type: String,
            enum: ['teamA', 'teamB', null],
            default: null,
        },
}, { _id: false });

const eventSchema = new mongoose.Schema({
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        time: {
            type: String,
            required: true,
        },
        location: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            required: true,
        },
        totalSeats: {
            type: Number,
            required: true,
        },
        availableSeats: {
            type: Number,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
        imageUrl: {
            type: String,
            required: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        tournament: {
            enabled: {
                type: Boolean,
                default: false,
            },
            format: {
                type: String,
                enum: ['knockout', 'league', null],
                default: null,
            },
            status: {
                type: String,
                enum: ['draft', 'generated', 'completed'],
                default: 'draft',
            },
            participants: {
                type: [tournamentTeamSchema],
                default: [],
            },
            matches: {
                type: [tournamentMatchSchema],
                default: [],
            },
            generatedAt: {
                type: Date,
                default: null,
            }
        }
   },{timestamps:true}); 
module.exports = mongoose.model('Event', eventSchema);
