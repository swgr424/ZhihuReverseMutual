(function() {
  util = new Util();

  // "followeer" := "followee" or "follower".
  var getFolloweers = function(numFolloweers, userHash, apiUrl, done) {
    var userDivToUser = function(userDiv) {
      return {
        id: userDiv.find("a.zm-item-link-avatar").attr("href").match(/\/people\/(.*)/)[1],
        avatar_medium_url: userDiv.find("img.zm-item-img-avatar").attr("src"),
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
    };
    var complete = function() {
      console.log(Object.keys(followeers).length + " followee/rs fetched.");
      done(followeers);
    }; 
    util.parallelPost(requests, success, complete);
  };  // getFolloweers

  var getMyFollowers = function(done) {
    var getNumFollowers = function(done) {
      var myId = util.getMyUserInfo().id;
      $.get("/people/" + myId, function(data) {
        var numFollowers = $(data).find("a[href='/people/" + myId + "/followers'] strong").text();
        done(numFollowers);
      });
    };
    
    var userHash = util.getMyUserInfo().userHash;
    getNumFollowers(function(numFollowers) { getFolloweers(numFollowers, userHash, "/node/ProfileFollowersListV2", done); });
  };  // getMyFollowers
  
  var getCurrentUserFollowees = function(done) {
    var numFollowees = $("a[href='/people/" + util.getCurrentUserInfo().id + "/followees'] strong").text();
    var userHash = util.getCurrentUserInfo().userHash;
    getFolloweers(numFollowees, userHash, "/node/ProfileFolloweesListV2", done);
  }
  
  var joinToFindMutual = function(followees, followers) {
    var result = {};
    for (var id in followees) {
      if (followees.hasOwnProperty(id) && followers.hasOwnProperty(id)) {
        result[id] = followees[id];
      }
    }
    return result;
  }
  
  var reverseMutualDiv = $('<div class="zm-profile-side-section"><div class="zm-side-section-inner zg-clear"></div></div>');
  var renderMutual = function(mutual) {
    var numMutual = Object.keys(mutual).length;
    var reverseMutualContent = $('<div class="zm-profile-side-same-friends zm-profile-side-reverse-same-friends"><div class="zm-profile-side-section-title">' + util.getCurrentUserGender() + '关注的人中，' + numMutual + ' 人</a>也关注我</div><div class="zu-small-avatar-list zg-clear"></div></div>');
    for (var id in mutual) {
      var avatarNode = $('<a title="' + mutual[id].nickName + '" data-tip="p$t$' + id + '" class="zm-item-link-avatar" href="/people/' + id + '"><img src="' + mutual[id].avatar_medium_url.replace(/_m\./, "_s.") + '" class="zm-item-img-avatar"></a>');
      reverseMutualContent.find("div.zu-small-avatar-list").append(avatarNode);
    }
    if (numMutual > 10) {
      $("<style type='text/css'> .zm-profile-side-same-friends.zm-profile-side-reverse-same-friends .zm-item-link-avatar{ margin-bottom: 3px; } </style>").appendTo("head");
    }
    reverseMutualDiv.find("div.zm-side-section-inner").empty().append(reverseMutualContent);
  }  // renderMutual
  
  var followees = null, followers = null;
  var triggerJoin = function() {
    if (followees && followers) {
      var mutual = joinToFindMutual(followees, followers);
      var numMutual = Object.keys(mutual).length;
      console.log(numMutual + " reverse mutual(s) found.");
      renderMutual(mutual);
    }
  };
  
  var start = function() {
    getCurrentUserFollowees(function(ee) { followees = ee; triggerJoin(); });
    getMyFollowers(function(er) { followers = er; triggerJoin(); });
  }
  
  var initMutualPanel = function() {
    var startButton = $("<button class='goog-buttonset-default'>获取逆向交集</button>");
    startButton.click(function() {
      var title = $("<div class='zm-profile-side-same-friends'><div class='zm-profile-side-section-title'>正在获取逆向交集，请耐心等待...</div></div>");
      var spinner = $("<div style='position:relative; display:inline-block; width: 40pt'>&nbsp;</div>")
      title.append(spinner);
      reverseMutualDiv.find("div.zm-side-section-inner").empty().append(title);
      spinner.spin({lines: 9, top: '50%', left: '50%', scale: 0.4});
      // TODO: 完全可以写个进度条。
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
