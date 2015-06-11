{
  'targets': [
    {
      'target_name': 'test_target',
      'type': 'executable',
      'sources': ['test/test_target.cpp']
    },
    {
      'target_name': 'watch_tests_target',
      'type': 'executable',
      'sources': ['test/watch_tests_target.cpp']
    },
    {
      'target_name': 'data_tests_target',
      'type': 'executable',
      'sources': ['test/data_tests_target.cpp']
    },
    {
      'target_name': 'stack_tests_target',
      'type': 'executable',
      'sources': ['test/stack_tests_target.cpp']
    },
    {
      'target_name': 'break_tests_target',
      'type': 'executable',
      'sources': ['test/break_tests_target.cpp']
    },
    {
      'target_name': 'exec_tests_target',
      'type': 'executable',
      'sources': ['test/exec_tests_target.cpp']
    },
    {
      'target_name': 'thread_tests_target',
      'type': 'executable',
      'sources': ['test/thread_tests_target.cpp'],
      'conditions': [
        ["OS=='linux'", {
          'cflags_cc': ['-std=c++11']
        }]
      ]
    }
  ]
}
