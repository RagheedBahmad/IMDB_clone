const Actor = require('./../models/actorModel');
const Movie = require("./../models/movieModel");

exports.getActorDetails = async (req, res) => {
  try {
    const actorId = req.params.id;
    const actor = await Actor.findOne({ id: actorId }).exec();

    if (!actor) {
      return res.status(404).render('error', { message: 'Actor not found' });
    }

    const movies = await Movie.find({ id: { $in: actor.actedIn } }).exec();

    res.render('actor', {
        actor,movies,
        user: req.user ? req.user : null,
        watchlist: req.user ? req.user.watchlist : null,
        isAuthenticated: !!req.user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
};
