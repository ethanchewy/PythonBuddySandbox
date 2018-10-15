var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var child_process = require('child_process');
var _ = require('underscore');

var app = express();

var port = process.env.PORT || 3000;

function find_error(id) {
  fs.readFile('./pylint_errors.txt', function(err, data) {
    if (err) throw err;
    let location = data.indexOf(id.toString());
    if (location >= 0) {
      search_text = s.slice(location);
      lines = search_text.split(/\n/);
      error_message = []
      for (var l in lines) {
          if (l.startsWith(':')){
            full_message = error_message.join("")
            // full_message = full_message.decode('utf-8')
            replaced = id+"):"
            full_message = full_message.replace(replaced, "")
            full_message = full_message.replace("Used", "Occurs")
            return full_message
          }
          error_message.push(l);
      }
    } else {
      return "No information at the moment";
    }
  });

  return "No information at the moment"
}

function format_error(error) {
  if(error === " " || error==null) {
    return null;
  }

  let list_words = error.split(" ");

  if(list_words.length < 3){
    return null;
  }

  if (error.includes("Your code has been rated at") > -1){
    return null;
  }

  let line_num = error.split(":")[1]

  let error_yet = false;
  let message_yet = false;
  let first_time = true;
  let i = 0;
  let full_message = "";
  // error_code=None
  length = list_words.length

  while (i < length) {
    word = list_words[i]
    if ((word == "error" || word == "warning") && first_time) {
        error_yet = true;
        first_time = false;
        i += 1;
        continue;
    }
    if(error_yet) {
      error_code = word.slice(1,-1);
      error_string = list_words[i+1].slice(0,list_words[i+1].length-2);
      i = i + 3;
      error_yet = false;
      message_yet = true;
      continue;
    }
    if(message_yet) {
      // full_message = ' '.join(list_words[i:length-1]);
      full_message = list_words.slice(i,length-1).join(' ');
      break;
    }
    i += 1
  }

  error_info = find_error(error_code);

  return {
      "code": error_code,
      "error": error_string,
      "message": full_message,
      "line": line_num,
      "error_info": error_info,
  }

}

function process_output(code) {
  let errors_list = code.split(/\n/);
  if (errors_list[1].includes("--------------------------------------------------------------------") &&
  errors_list[2].includes("Your code has been rated at") && !errors_list[0].includes("module")){
    return None
  }

  errors_list.shift();

  pylint_dict = [];

  for(let i = 0; i<errors_list(); i++) {
    pylint_dict.push(format_error(errors_list[i]));
  }



}

app.use(bodyParser.json());

app.post('/', function (req, res) {

    res.setHeader('Content-Type', 'application/json');

  	if (!req.body.code || !req.body.timeoutMs) {
        res.status(400);
        res.end(JSON.stringify({error: "no code or timeout specified"}));
  	}
  	else {
  	   res.status(200);
  		// Write code to file
  		fs.writeFileSync('./code.py', req.body.code);

      //clean up later
      console.log("HELLO");
      // console.log(req);
      console.log(req.body);
      console.log(res);
      // var executor = "python3";
      // var job = child_process.spawn(executor, ["-u", "./code.py"], { cwd: __dirname })
      // var output = {stdout: '', stderr: '', combined: ''};
      let executor, job, output = null;

      //FIGURE OUT WHY TYPEREQUEST IS NOT SHOWING UP IN NODEJS SERVER??????
      if (req.body.typeRequest == "run") {
        console.log("run_code");
        executor = "python3";
    		job = child_process.spawn(executor, ["-u", "./code.py"], { cwd: __dirname })
    		output = {stdout: '', stderr: '', combined: ''};
        job.stdout.on('data', function (data) {
            output.stdout += data;
            output.combined += data;
        })

        job.stderr.on('data', function (data) {
            output.stderr += data;
            output.combined += data;
        })
      } else if (req.body.typeRequest == "lint") {
        console.log("lint");
        executor = "pylint"
        job = child_process.spawn(executor, ["./code.py", "--reports=n", "--disable=R,C"], { cwd: __dirname })
        // output = {
        //   stdout: {
        //     code: '',
        //     error: '',
        //     message: '',
        //     line: '',
        //     error_info: '',
        //   },
        //   stderr: '',
        //   combined: ''
        // };

        job.stdout.on('data', function (data) {
            output.stdout = process_output(data);
            output.combined += data;
        })

        job.stderr.on('data', function (data) {
            output.stderr += data;
            output.combined += data;
        })
      }

    	// Timeout logic
  		var timeoutCheck = setTimeout(function () {
  		    console.error("Process timed out. Killing")
  		    job.kill('SIGKILL');
  		    var result = _.extend(output, { timedOut: true, isError: true, killedByContainer: true });
  		    res.end(JSON.stringify(result));
  		}, req.body.timeoutMs)

  		job.on('close', function (exitCode) {
  		   var result = _.extend(output, { isError: exitCode != 0 })
  		   res.end(JSON.stringify(result));
  		   clearTimeout(timeoutCheck);
  		});

  	}
});

app.listen(port, function () {
	console.log('Container service running on port '+port);
});
