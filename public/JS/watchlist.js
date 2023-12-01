$(window).on("load", function () {
  $(".watch").each(function () {
    if (watchlist.some((movie) => movie.id === $(this).data("movie") * 1)) {
      let text = $(this).hasClass("watchListhover")
        ? "Remove From Watchlist"
        : "&cross;";
      $(this).html(text);
      $(this).removeClass("watch");
      $(this).addClass("remove");
    }
  });
});
$(document).on("click", ".remove", function (event) {
  event.stopPropagation();
  let button = $(this);
  button.prop("disabled", true);
  let movieID = button.data("movie") * 1;
  $.ajax({
    url: "/remove-watchlist",
    type: "POST",
    data: { user, movieID },
    success: function (response) {
      removeFromWatchlist(response.movieID);
      addButtons(response.movieID);
      console.log(response.movieID);
      console.log(watchlist);
      watchlist = watchlist.filter((movie) => {
        console.log(movie.id);
        return movie.id != response.movieID;
      });
      console.log(watchlist);
      if (watchlist.length === 0) $("#watchlistP").show();
    },
    error: function () {
      console.log("Error removing movie from watchlist");
      button.prop("disabled", false);
    },
  });
});
$(document).on("click", ".watch", function (event) {
  event.stopPropagation();
  let button = $(this);
  button.prop("disabled", true);
  let movieID = button.data("movie");
  movieID = movieID * 1;

  // Perform the AJAX request
  $.ajax({
    url: "/watchlist",
    type: "POST",
    data: { user, movieID },
    success: function (response) {
      $("#watchlistP").hide();
      addToWatchlist(response.movie[0]);
      watchlist.push(response.movie[0]);
      console.log(watchlist);
      crossButtons(response.movie[0].id);
    },
    error: function () {
      console.log("Error adding movie to watchlist");
      button.prop("disabled", false);
    },
  });
});

function addToWatchlist(movie) {
  let div = `<div class="card" id="movie-${movie.id}">
<button class="watchlist-btn remove" data-movie=${movie.id}>&cross;</button>
    <a href="/movies/${movie.id}"><img class="card-img-top" src="${movie.poster_path}" alt="Card image cap" style="z-index: 1;"></a>
    <img class="card-img-top" src="${movie.poster_path}" alt="Card image cap" style="filter:blur(50px); z-index: -2; position: absolute; width: 80%; height: auto; top:10%; left: 10%;">
    <div class="card-body">
        <a href="/movies/${movie.id}"><h5 class="card-title" style="color: #7f9eb9">${movie.original_title}</h5></a>
        <a href="/movies/${movie.id}"><p class="card-text" style="color: #7f9eb9">${movie.tagline}</p></a>
    </div>
    <div style="display: flex; justify-content: center; align-items: center;">
        <a href="https://twitter.com/share?ref_src=twsrc%5Etfw" class="twitter-share-button" data-show-count="false">Tweet</a>
        <button type="button" class="btn btn-secondary btn-sm" style="margin: 5px;" onclick="copy('${movie.id}')" id="id">Copy</button>
    </div>
</div>`;
  $("#watchlist").append(div);
}

function removeFromWatchlist(movie) {
  console.log("removing " + movie);
  $(`#movie-${movie}`).remove();
}

function addButtons(movie) {
  $(`button[data-movie="${movie}"]`).each(function () {
    $(this).removeClass("remove");
    $(this).addClass("watch");
    let text = $(this).hasClass("watchListhover") ? "Add To Watchlist" : "+";
    $(this).html(text);
    $(this).prop("disabled", false);
  });
}

function crossButtons(movie) {
  $(`button[data-movie="${movie}"]`).each(function () {
    let text = $(this).hasClass("watchListhover")
      ? "Remove From Watchlist"
      : "&cross;";
    $(this).html(text);
    $(this).addClass("remove");
    $(this).removeClass("watch");
    $(this).prop("disabled", false);
  });
}
