$(function() {
  // https://gist.github.com/992678
  var pad = function(s,l,c,u){c=new Array((l=(l||0)-(''+s).length+1)>0&&l||0).join(c!=u?c:' ');return {l:c+s,r:s+c,toString:function(){return c+s}}}

  // return YYYY-MM-DD string
  function dateString(t) {
    t = t || new Date;
    return (t.getYear() + 1900)+"-"+pad(t.getMonth()+1,2,0)+"-"+pad(t.getDate(),2,0);
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

  function appendTodo(data) {
    var obj = $("li.placeholder").first().removeClass("placeholder")
    if(obj.length === 0) {
      console.log("appendTodo without placeholder");
      obj = $('<li><p></p> <span class="delete"><a href="">x</a></span></li>')
      $("div.list ul").append(obj);
    }
    obj.find("p").text(data.todo);
    obj.attr('data-id', data.id);
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
        if(t.do_on === TODAY) {
          appendTodo(t);
        }
      }
    });
  }

  var ToDo = (function() {
    function get(url, success, error) {
      $.ajax({
        url: url,
        success: success,
        error: error,
        dataType: "json"
      });
    }

    function post(url, data, success, error) {
      // we need "text" here for delete
      var dataType = data.dataType || "json";
      delete data["dataType"];

      $.ajax({
        url: url,
        type: "POST",
        data: data,
        dataType: dataType,
        success: success,
        error: error,
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
      list: function listTodos(success, error) {
        get("/teuxdeux/list.json", success, error);
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
  $('.date').swipe({
    swipeLeft: function() { console.log("date switch not implemented"); }, // next
    swipeRight: function() { console.log("date switch not implemented"); } // prev
  })

  // add new todo on submit
  $("form.new_todo").submit(function(e) {
    e.preventDefault();
    var entry = $(e.target).find("input.entry");
    var val = entry.val();
    if(val && val.length > 0) {
      ToDo.create(val, $(e.target).find("input.item_date").val(), function(data) {
        entry.val('');
        appendTodo(data);
      });
    }
  });

  // toggle status when clicked
  $("li").live('click', function(e) {
    if(e.target.nodeName != 'A') {
      e.preventDefault();
      var t = $(e.target);
      if(e.target.nodeName == 'P')
        t = t.parent();

      if(!t.hasClass('placeholder')) {
        ToDo.toggle(t.attr('data-id'), t.hasClass('crossedout') ? false : true, function() {
          t.toggleClass('crossedout');
        });
      }
    }
  });

  // delete items
  $("li.crossedout span.delete a").live('click', function(e) {
    e.preventDefault();
    var t = $(e.target).parent().parent();

    var id = t.attr('data-id');
    ToDo.remove(id, function() {
      t.remove();

      if($("div.list ul li").length < 12) {
        obj = $('<li class="placeholder"><p></p> <span class="delete"><a href="">x</a></span></li>')
        $("div.list ul").append(obj);
      }
    });
  });

  // replace "current time" header with real data
  var TODAY = dateString();
  $("div.today h1 span").text(getDayname());
  $("div.today h3").text(TODAY);
  $("input.item_date").val(TODAY);

  // load default data
  ToDo.user(function(data) {
    console.log("user", data);
    fetchTodos();
  }, function(req, stat) {
    // need error handling
    console.log(req, stat);
  });

  // skip URL bar in mobile browser
  /mobile/i.test(navigator.userAgent) && !location.hash && setTimeout(function () {
    window.scrollTo(0, 1);
  }, 1000);
});
