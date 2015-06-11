#include <cstdio>
#include <thread>
#include <vector>
#include <cstring>

void funcA()
{
    return;
}

int main(int argc, const char *argv[])
{
    int threadCount = 1;
    if (argc == 3)
    {
        if (strcmp(argv[1], "--threads") == 0)
        {
            threadCount = atoi(argv[2]);
        }
    }

    // the first thread already exists, now create any additional threads
    std::vector<std::thread> threads;
    for (int i = 1; i < threadCount; ++i)
    {
        threads.push_back(std::thread(funcA));
    }
    
    for(auto& thread : threads)
    {
        thread.join();
    };
    return 0;
}
