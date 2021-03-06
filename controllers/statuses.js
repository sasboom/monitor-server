const eventsRepo = require('../repositories/events');
const usersRepo = require('../repositories/users');
const statusSchema = require('../validation/status');
const jwt = require('jsonwebtoken');
const R = require('ramda');

const privateKey = process.env.PRIVATE_KEY || 'foobar';

//TODO: Move this fn to a utility file or part of route chain prior to hitting controller code
const getUserFromToken = req => {
    const token = req.headers["authorization"].split(" ")[1];
    const decodedToken = jwt.verify(token, privateKey);
    const user = R.omit(['iat'], decodedToken);
    return user;
}

//TODO: Move parameter checks to a separate service file
const newStatus = (req, res, next) => {
    const user = getUserFromToken(req);
    const {error, value} = statusSchema.validate(req.body);
    if (error) {
        res.status(400).send({error: error});
        return next();
    }
    const eventType = value.type;
    return eventsRepo.getLastStatusEventForUser(user.id)
    .then(lastEvent => {
        if (lastEvent !== undefined) {
            if (lastEvent.event_type === 'USER_CHECKED_IN' && eventType !== 'USER_CHECKED_OUT') {
                res.status(400).send("You need to check out before you can check in.");
                return next();
            } else if (lastEvent.event_type !== 'USER_CHECKED_IN' && eventType !== 'USER_CHECKED_IN') {
                res.status(400).send("You need to check in before you can check out.");
                return next();
            }
        } else {
            if (eventType !== 'USER_CHECKED_IN') {
                res.status(400).send("You need to check in before you can check out.");
                return next();
            }
        }
        return eventsRepo.insertEvent(eventType, user, user.id)
        .then(event => {
            res.status(200).send(event);
            return next();
        })
        .catch(err => {
            res.status(500).send({error: err});
            return next();
        });
    });
}

const getStatusHistoryForUser = (req, res, next) => {
    const user = getUserFromToken(req);
    const offset = req.query.offset;
    const limit = req.query.limit;
    if (user.id !== req.params.user_id) {
        res.status(403).send("You are not authorized to view this.");
    }
    return eventsRepo.getEventsForUser(req.params.user_id, offset, limit)
    .then(events => {
        res.status(200).send({events: events});
        return next();
    })
    .catch(err => {
        res.status(500).send({error: err});
        return next();
    });
}

const getStatusHistoryForAllUsers = (req, res, next) => {
    const user = getUserFromToken(req);
    const offset = req.query.offset;
    const limit = req.query.limit;
    return usersRepo.getUserByUserId(user.id)
    .then(user => {
        if (!user) {
            res.status(403).send("You are not authorized to view this.");
        }
        return user;
    })
    .then(() => eventsRepo.getEventsForAllUsers(offset, limit))
    .then(events => {
        res.status(200).send({events: events});
        return next();
    })
    .catch(err => {
        res.status(500).send({error: err});
        return next();
    });
}

module.exports = {
    newStatus,
    getStatusHistoryForUser,
    getStatusHistoryForAllUsers,
}