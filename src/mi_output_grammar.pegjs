start
  = out_of_band_record
  / result_record

result_record
  = token? '^' result_class (',' result)*

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
  = 'done'
  / 'running'
  / 'connected'
  / 'error'
  / 'exit'

async_class
  = 'stopped'

result
  = variable '=' value

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
  = '~' stream_text: c_string {
    return stream_text;
  }

target_stream_output
  = '@' stream_text: c_string {
    return stream_text;
  }

log_stream_output
  = '&' stream_text: c_string {
    return stream_text;
  }

c_string "double-quoted-string"
  = '"' chars: c_string_char* '"' {
    return chars.join('');
  }

c_string_char
  = !'"' . {
    return text();
  }

token
  = digits:[0-9]+ {
    return parseInt(digits.join(''), 10);
  }
