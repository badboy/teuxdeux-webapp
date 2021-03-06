(function() {
  // https://gist.github.com/992678
  var pad = function(s,l,c,u){c=new Array((l=(l||0)-(''+s).length+1)>0&&l||0).join(c!=u?c:' ');return {l:c+s,r:s+c,toString:function(){return c+s}}}

  // return YYYY-MM-DD string
  function dateString(t) {
    t = t || new Date;
    return (t.getFullYear())+"-"+pad(t.getMonth()+1,2,0)+"-"+pad(t.getDate(),2,0);
  }

  // return new date object with an additional method
  // * toString returns YYYY-MM-DD formatted string
  function dateNow() {
    var t = new Date;
    t.toString = function() { return dateString(t); }
    return t;
  }

  // return english dayname
  function getDayname(date) {
    date = date || new Date;
    return [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ][date.getDay()];
  }

  // return english monthname
  function getMonthname(date) {
    date = date || new Date;
    return [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ][date.getMonth()];
  }

  function appendTodo(data) {
    var obj = $("li.placeholder").first().removeClass("placeholder")
    if(obj.length === 0) {
      obj = $('<li><p></p> <span class="delete"><a href="">x</a></span></li>');
      $("div.list ul").append(obj);
    }
    obj.find("p").text(data.todo);
    obj.attr("data-id", data.id);
    if(data.done) {
      obj.addClass("crossedout");
    }
  }

  // fetch all todos and show the current ones
  function fetchTodos() {
    ToDo.list(function(data) {
      $("li.loading").remove();

      for(id in data) {
        var t = data[id];
        if(t.do_on === TODAY.toString()) {
          appendTodo(t);
        }
      }
    });
  }

  var ToDo = (function() {
    function spinner(spin) {
      if(spin) $('.head .loading img').addClass('spinning');
      else $('.head .loading img').removeClass('spinning');
    }

    function get(url, success, error) {
      spinner(true);
      $.ajax({
        url: url,
        success: function(data) {
          spinner();
          success(data);
        },
        error: function(xhr, type) {
          spinner();
          error(xhr, type)
        },
        dataType: "json"
      });
    }

    function post(url, data, success, error) {
      // we need "text" here for delete
      var dataType = data.dataType || "json";
      delete data["dataType"];

      spinner(true);
      $.ajax({
        url: url,
        type: "POST",
        data: data,
        dataType: dataType,
        success: function(data) {
          spinner();
          success(data)
        },
        error: function(xhr, type) {
          spinner();
          error(xhr, type)
        },
      });
    }

    return {
      // get user info
      user: function user(success, error) {
        get("/teuxdeux/user.json", success, error);
      },

      // create new todo
      //   done & position are optional
      create: function createTodo(todo, date, done, position, success, error) {
        if(typeof done === "function") {
          success = done;
          done = false;

          if(typeof position === "function") {
            error = position;
            position = 0;
          }
        }

        post("/teuxdeux/todo.json", {
          "todo_item": {
            "todo": todo,
            "do_on": date || dateString(),
            "done": done ? 1 : 0,
            "position": position || 0
          }
        }, success, error);
      },

      // remove todo item by id
      remove: function removeTodo(id, success, error) {
        post("/teuxdeux/todo/"+id, { "_method": "delete", "dataType":"text" }, success, error);
      },

      // get list of all todos
      list: function listTodos(since, success, error) {
        if(typeof since === "string")
          get("/teuxdeux/list.json?since="+encodeURIComponent(since), success, error);
        else
          // since is success and
          // success is error
          get("/teuxdeux/list.json", since, success);
      },

      // toggle done status of given todo
      toggle: function toggleTodo(id, status, callback, error) {
        var data = { "todo_item": {} };
        data["todo_item"][id] = { done: status ? 1 : 0 };
        post("/teuxdeux/update.json", data, callback, error);
      }
    };
  })();

  /**
   * once we got a proper webapp working,
   * we want some more functionality:
   *   real date switching thingy (and "someday" list)
   **/
  $(".date").
    // next
    swipeLeft(function() { console.log("date switch not implemented"); }).
    // prev
    swipeRight(function() { console.log("date switch not implemented"); });

  // add new todo on submit
  $("form.new_todo").bind("submit", function(e) {
    e.preventDefault();
    var entry = $(e.target).find("input.entry");
    var val = entry.val();
    entry.val("");
    if(val && val.length > 0) {
      ToDo.create(val, $(e.target).find("input.item_date").val(), function(data) {
        $(".newdate").remove();
        $(".newdate_todo").remove();
        appendTodo(data);
      }, function(err) {
        entry.val(val);
      });
    }
  });

  // toggle status when clicked
  $("li").live("click", function(e) {
    if(e.target.nodeName != "A") {
      e.preventDefault();
      var t = $(e.target);
      if(e.target.nodeName == "P")
        t = t.parent();

      if(!t.hasClass("placeholder") && !t.hasClass("newdate") && !t.hasClass("newdate_todo")) {
        ToDo.toggle(t.attr("data-id"), t.hasClass("crossedout") ? false : true, function() {
          t.toggleClass("crossedout");
        });
      }
    }
  });

  $(".head span.user a").live("click", function(e) {
    e.preventDefault();

    if($("li.newdate").length > 0 || $("li.newdate_todo").length > 0) {
      $("li.newdate").remove();
      $("li.newdate_todo").remove();
      return;
    }

    // the next day.
    var newDate = new Date(TODAY);
    newDate.setDate(newDate.getDate()+1);

    var placeholders = $("li.placeholder");
    [].shift.call(placeholders);
    placeholders.remove();

    ToDo.list(TODAY.toString(), function(data) {
      data = data.sort(function(a, b) {
        return (((new Date(a.do_on)) > (new Date(b.do_on))) ? 1 : -1);
      });

      var limit = 20, c = 0;
      var t;
      var h = '<li><p></p> <span class="delete"><a href="">x</a></span></li>';
      for(var i=0;t=data[i++];) {
        //var t = data[id];
        if($("li[data-date='"+t.do_on+"']").length == 0) {
          obj = $(h)

          var d = new Date(t.do_on);
          obj.addClass("newdate").
            attr("data-date", t.do_on).
            find("p").text(getDayname(d) + ", " + t.do_on);

          $("div.list ul").append(obj);
        }

        var newtodo = $(h);
        newtodo.find("p").text(t.todo);
        newtodo.attr("data-id", t.id);
        newtodo.addClass("newdate_todo");
        if(t.done) {
          newtodo.addClass("crossedout");
        }
        $("div.list ul").append(newtodo);

        c++;
        if(c > limit) break;
      }
    });
  });

  // delete items
  $("li.crossedout span.delete a").live("click", function(e) {
    e.preventDefault();
    var t = $(e.target).parent().parent();

    var id = t.attr("data-id");
    ToDo.remove(id, function() {
      t.remove();

      if($("div.list ul li").length < 12) {
        obj = $('<li class="placeholder"><p></p> <span class="delete"><a href="">x</a></span></li>')
        $("div.list ul").append(obj);
      }
    });
  });

  var TODAY = dateNow();

  // replace "current time" header with real data
  $("div.today h1 span").text(getDayname(TODAY));
  $("div.today h3").text(getMonthname(TODAY)+' '+TODAY.getDate()+", "+TODAY.getFullYear());
  $("input.item_date").val(TODAY.toString());

  // skip URL bar in mobile browser
  /mobile/i.test(navigator.userAgent) && !location.hash && setTimeout(function () {
    window.scrollTo(0, 1);
  }, 1000);

  // load default data
  ToDo.user(function(data) {
    $("div.head span.user a").text(data.login);
    fetchTodos();
  }, function(req, stat) {
    // need error handling
    console.log(req, stat);
  });
})();
