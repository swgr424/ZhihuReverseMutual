(function() {
  util = new Util();

  // "followeer" := "followee" or "follower".
  var getFolloweers = function(numFolloweers, userHash, apiUrl, done) {
    var userDivToUser = function(userDiv) {
      return {
        id: userDiv.find("a.zm-item-link-avatar").attr("href").match(/\/people\/(.*)/)[1],
        avatar_medium_url: userDiv.find("img.zm-item-img-avatar").attr("src"),
        is_following_me: userDiv.find("button[data-followme='1']").length > 0
      };
    };
  
    var xsrf = util.getXsrf();
    
    var followeers = {};
    var requests = [];
    var numRequests = numFolloweers / 20 + (numFolloweers % 20 == 0);
    for (var i = 0; i < numRequests; ++i) {
      var request = {};
      request.data = {
        method: "next",
        // For params, Zhihu only accept double quote. Single quote doesn't work.
        params: '{"offset":' + (20*i) + ',"order_by":"created","hash_id":"' + userHash + '"}',
        _xsrf: xsrf
      };
      request.url = apiUrl;
      requests.push(request);
    }
    var success = function(data) {
      data.msg.forEach(function(msg) {
        var user = userDivToUser($(msg));
        followeers[user.id] = user;
      });
      progressUpdate(data.msg.length);
    };
    var complete = function() {
      console.log(Object.keys(followeers).length + " followee/rs fetched.");
      done(followeers);
    };
    var progressUpdate = (function () {
      // When the change in the number of the finished tasks
      // is larger than a threshold, we update UI.
      var CONST = {
        THRESHOLD : 0.05
      };
      var totalTasks = numFolloweers,
          updateThreshold = Math.ceil(CONST.THRESHOLD * numFolloweers),
          curProgress = 0,
          changeCount = 0;

      function updateProgressCount(finishedTask) {
        curProgress += finishedTask;
        changeCount += finishedTask;
      }
      
      function updateProgressUI() {
        var newProgress = Math.ceil(curProgress * 100.0 / totalTasks) + "%";
        progressBar.find('.profile-progress-completeness').width(newProgress).text(newProgress);
      }

      return function (finishedTask) {
        updateProgressCount(finishedTask);
        if (changeCount >= updateThreshold) {
          updateProgressUI();
          changeCount = 0;
        }
      }
    })();
    util.parallelPost(requests, success, complete);
  };  // getFolloweers

  var getCurrentUserFollowees = function(done) {
    var numFollowees = $("a[href='/people/" + util.getCurrentUserInfo().id + "/followees'] strong").text();
    var userHash = util.getCurrentUserInfo().userHash;
    getFolloweers(numFollowees, userHash, "/node/ProfileFolloweesListV2", done);
  }
  
  var findMutual = function(followees) {
    var result = {};
    for (var id in followees) {
      if (followees.hasOwnProperty(id) && followees[id].is_following_me) {
        result[id] = followees[id];
      }
    }
    return result;
  }
  
  var reverseMutualDiv = $('<div class="zm-profile-side-section"><div class="zm-side-section-inner zg-clear"></div></div>');
  var progressBar = $("<div style='margin-bottom: 20px;'><span class='profile-progress-bar' style='left: 0; right: 35px;'><span class='profile-progress-completeness' style='width: 0%;'>&nbsp;</span></span></div>");

  var renderMutual = function(mutual) {
    var numMutual = Object.keys(mutual).length;
    var reverseMutualContent = $('<div class="zm-profile-side-same-friends zm-profile-side-reverse-same-friends"><div class="zm-profile-side-section-title">' + util.getCurrentUserGender() + '关注的人中，' + numMutual + ' 人</a>也关注我</div><div class="zu-small-avatar-list zg-clear"></div></div>');
    for (var id in mutual) {
      var avatarNode = $('<a title="' + mutual[id].nickName + '" data-tip="p$t$' + id + '" class="zm-item-link-avatar" href="/people/' + id + '"><img src="' + mutual[id].avatar_medium_url.replace(/_m\./, "_s.") + '" class="zm-item-img-avatar"></a>');
      reverseMutualContent.find("div.zu-small-avatar-list").append(avatarNode);
    }
    if (numMutual > 9) {
      $("<style type='text/css'> .zm-profile-side-same-friends.zm-profile-side-reverse-same-friends .zm-item-link-avatar{ margin-bottom: 3px; } </style>").appendTo("head");
    }
    progressBar.remove();
    reverseMutualDiv.find("div.zm-side-section-inner").empty().append(reverseMutualContent);
  }  // renderMutual
  
  var start = function() {
    getCurrentUserFollowees(function(followees) {
      var mutual = findMutual(followees);
      var numMutual = Object.keys(mutual).length;
      console.log(numMutual + " reverse mutual(s) found.");
      renderMutual(mutual);
    });
  }
  
  var initMutualPanel = function() {
    var startButton = $("<button class='goog-buttonset-default'>获取逆向交集</button>");
    startButton.click(function() {
      var title = $("<div class='zm-profile-side-same-friends'><div class='zm-profile-side-section-title'>正在获取逆向交集，请耐心等待...</div></div>");
      var spinner = $("<div style='position:relative; display:inline-block; width: 40pt'>&nbsp;</div>")
      title.append(spinner);
      reverseMutualDiv.find("div.zm-side-section-inner").empty().append(title).end().append(progressBar);
      spinner.spin({lines: 9, top: '50%', left: '50%', scale: 0.4});
      start();
    })
    reverseMutualDiv.find("div.zm-side-section-inner").append(startButton);
    var nodeToAppendAfter = $("div.zm-profile-side-following");
    if ($("div.zm-profile-side-same-friends").length > 0) {
      nodeToAppendAfter = nodeToAppendAfter.next();
    }
    nodeToAppendAfter.after(reverseMutualDiv);
  }  // initMutualPanel
  
  if (util.getCurrentUserInfo().id != util.getMyUserInfo().id) {
    initMutualPanel();
  }
})();
