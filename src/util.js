function Util() {
  this.getCurrentUserGender = function() {
    var genderInput = $('input[name="gender"][checked="checked"]');
    if (genderInput.length > 0) return genderInput.attr("class") == "male" ? "他" : "她";
    return "虵";
  }
  
  this.getCurrentUserInfo = function() {
    // [nickname,id,avatar_small_url,user_hash]
    var userInfoArr = eval($("script[data-name='current_people']").text());
    return {
      id: userInfoArr[1],
      userHash: userInfoArr[3]
    };
  }
  
  this.getMyUserInfo = function() {
    // [nickname,id,avatar_small_url,user_hash,?,?,?,?,email,?,?,?,?,?,?]
    var userInfoArr = eval($("script[data-name='current_user']").text());
    return {
      id: userInfoArr[1],
      userHash: userInfoArr[3]
    };
  }

  this.getXsrf = function() {
    return $("input[name='_xsrf']").attr("value");
  }

  function ParallelFetcher() {
    var kMaxParallelRequests = 30;
    var runningRequest = 0;
    var worksQueue = [];

    var schedule = function() {
      while (worksQueue.length > 0 && runningRequest < kMaxParallelRequests) {
        var work = worksQueue.shift();
        ++runningRequest;
        work(function() {
          --runningRequest;
          schedule();
        });
      }
    }

    this.parallelPost = function(requests, success, complete) {
      var num_requests = requests.length;
      var num_complete = 0;
      
      requests.forEach(function(request) {
        var work = function(done) {
          $.ajax({
            url: request.url,
            dataType: "json",
            method: "POST",
            data: request.data,
            success: function(data) {
              success(data);
              done();
              ++num_complete;
              if (num_complete == num_requests) complete();
            },
            error: function(data) {
              console.log("Request failed. Retrying...");
              setTimeout(function() { work(done); }, 1000);
            }
          });
        };
        
        worksQueue.push(work);
        schedule();
      });
    }  // parallelPost
  }  // ParallelFetcher
  
  this.parallelPost = new ParallelFetcher().parallelPost;
}