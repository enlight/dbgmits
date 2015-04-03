{ // Start of code that is injected into the generated PEG parser.

var mioutput = require('./mi_output');

function getAsyncRecordType(char) {
  switch (char) {
    case '*':
      return mioutput.RecordType.AsyncExec;

    case '+':
      return mioutput.RecordType.AsyncStatus;

    case '=':
      return mioutput.RecordType.AsyncNotify;

    // todo: throw an error if no match found!
  }
}
  
} // End of code that is injected into the generated PEG parser.

start
  = out_of_band_record
  / result_record

result_record
  = t:token? '^' resultType:result_class results:comma_delimited_results? {
    return {
      token: t,
      recordType: resultType,
      data: results
    }
  }

out_of_band_record
  = async_record 
  / stream_record

async_record
  = t:token? at:[*+=] ac:async_class results:comma_delimited_results? {
    return {
      token: t,
      recordType: getAsyncRecordType(at),
      data: [ac, results]
    }
  }

result_class
  = 'done' { return mioutput.RecordType.Done; }
  / 'running' { return mioutput.RecordType.Running; }
  / 'connected' { return mioutput.RecordType.Connected; }
  / 'error' { return mioutput.RecordType.Error; }
  / 'exit' { return mioutput.RecordType.Exit; }

async_class
  = variable

comma_delimited_results
  = results:(',' r:result { return r; })+ {
    var dict = {};
    for (var i = 0; i < results.length; i++) {
      dict[results[i][0]] = results[i][1];
    }
    return dict;
  }

result
  = n:variable '=' v:value {
    return [n, v];
  }

// todo: this needs some refinement
variable "variable-identifier"
  = variable_start variable_part* {
    return text();
  }

variable_start
  = [a-z]i

variable_part
  = variable_start
  / [-_]

value
  = c_string
  / tuple
  / list

tuple
  = '{}'
  / '{' result (',' result)* '}'

list
  = '[]' { return {}; }
  / '[' value (',' value)* ']'
  / '[' first:result rest:comma_delimited_results? ']' {
    rest[first[0]] = first[1];
    return rest;
  }

stream_record
  = console_stream_output
  / target_stream_output
  / log_stream_output

console_stream_output
  = '~' streamText:c_string {
    return { 
      recordType: mioutput.RecordType.ConsoleStream, 
      data: streamText
    }
  }

target_stream_output
  = '@' streamText:c_string {
    return { 
      recordType: mioutput.RecordType.TargetStream, 
      data: streamText
    }
  }

log_stream_output
  = '&' streamText:c_string {
    return { 
      recordType: mioutput.RecordType.DebuggerStream, 
      data: streamText
    }
  }

c_string "double-quoted-string"
  = '"' chars:c_string_char* '"' {
    return chars.join('');
  }

c_string_char
  = !'"' . {
    return text();
  }

token
  = digits:[0-9]+ {
    return digits.join('');
  }
