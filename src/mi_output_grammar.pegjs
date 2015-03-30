{ // Start of code that is injected into the generated PEG parser.

var mioutput = require('./mi_output');
  
} // End of code that is injected into the generated PEG parser.

start
  = out_of_band_record
  / result_record

result_record
  = token? '^' resultType:result_class results:comma_delimited_results? {
    return {
      contentType: resultType,
      content: results
	}
  }

out_of_band_record
  = async_record 
  / stream_record

async_record
  = exec_async_output
  / status_async_output
  / notify_async_output

exec_async_output
  = token? '*' async_output

status_async_output
  = token? '+' async_output

notify_async_output
  = token? '=' async_output

async_output
  = async_class (',' result)*

result_class
  = 'done' { return mioutput.ParseOutputType.Done; }
  / 'running' { return mioutput.ParseOutputType.Running; }
  / 'connected' { return mioutput.ParseOutputType.Connected; }
  / 'error' { return mioutput.ParseOutputType.Error; }
  / 'exit' { return mioutput.ParseOutputType.Exit; }

async_class
  = 'stopped'

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
  / [-]

value
  = c_string
  / tuple
  / list

tuple
  = '{}'
  / '{' result (',' result)* '}'

list
  = '[]'
  / '[' value (',' value)* ']'
  / '[' result (',' result)* ']'

stream_record
  = console_stream_output
  / target_stream_output
  / log_stream_output

console_stream_output
  = '~' streamText:c_string {
    return { 
      contentType: mioutput.ParseOutputType.ConsoleStream, 
      content: streamText
    }
  }

target_stream_output
  = '@' streamText:c_string {
    return { 
      contentType: mioutput.ParseOutputType.TargetStream, 
      content: streamText
    }
  }

log_stream_output
  = '&' streamText:c_string {
    return { 
      contentType: mioutput.ParseOutputType.DebuggerStream, 
      content: streamText
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
