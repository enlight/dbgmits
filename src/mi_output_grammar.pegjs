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

// converts an array of key-value objects into a single object where each key is a property,
// if a key appears in the input array multiple times the corresponding property in the
// returned object will be an array of values
function createObjFromResultList(resultList) {
  var dict = {};
  if (resultList) {
    resultList.forEach(function(result) {
      var prevValue = dict[result.name];
      if (prevValue === undefined) {
        dict[result.name] = result.value;
      } else if (Array.isArray(prevValue)) {
        dict[result.name].push(result.value);
      } else {
	    // a property with this name already exists, so convert it to an array
        dict[result.name] = [prevValue, result.value];
      }
	});
  }
  return dict;
}
  
} // End of code that is injected into the generated PEG parser.

start
  = out_of_band_record
  / result_record

result_record
  = t:token? '^' resultType:result_class results:comma_prefixed_results? {
    return {
      token: t,
      recordType: resultType,
      data: createObjFromResultList(results)
    }
  }

out_of_band_record
  = async_record 
  / stream_record

async_record
  = t:token? at:[*+=] ac:async_class results:comma_prefixed_results? {
    return {
      token: t,
      recordType: getAsyncRecordType(at),
      data: [ac, createObjFromResultList(results)]
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

comma_prefixed_results
  = (',' r:result { return r; })+

result_list
  = first:result rest:comma_prefixed_results? {
      var results = [first];
      if (rest) {
	    // append the contents of rest to results
        Array.prototype.push.apply(results, rest);
      }
      return createObjFromResultList(results);
    }

result
  = n:variable '=' v:value {
    return { name: n, value: v };
  }

comma_prefixed_values
  = (',' v:value { return v; })+

value_list
  = first:value rest:comma_prefixed_values? {
      var values = [first];
      if (rest) {
        Array.prototype.push.apply(values, rest);
      }
      return values;
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
  = '{}' { return {}; }
  / '{' results:result_list '}' {
      return results;
    }

list
  = '[]' { return []; }
  / '[' values:value_list ']' {
      return values;
    }
  / '[' results:result_list ']' {
      return results;
    }

stream_record
  = console_stream_output
  / target_stream_output
  / log_stream_output

console_stream_output
  = '~' streamText:c_string {
    return { 
      recordType: mioutput.RecordType.DebuggerConsoleOutput, 
      data: streamText
    }
  }

target_stream_output
  = '@' streamText:c_string {
    return { 
      recordType: mioutput.RecordType.TargetOutput, 
      data: streamText
    }
  }

log_stream_output
  = '&' streamText:c_string {
    return { 
      recordType: mioutput.RecordType.DebuggerLogOutput, 
      data: streamText
    }
  }

c_string "double-quoted-string"
  = '"' chars:c_string_char* '"' {
    return chars.join('');
  }

escape_char
  = "'"
  / '"'
  / '\\'
  / 'n' { return '\n'; }
  / 'r' { return '\r'; }
  / 't' { return '\t'; }

c_string_char
  = !('"' / '\\') . { return text(); }
  / '\\' char:escape_char { return char; }

token
  = digits:[0-9]+ {
    return digits.join('');
  }
