#include <cstdio>

struct Point
{
    float x;
    float y;
};

int get10()
{
    return 10;
}

int getInt(int someInt)
{
    return someInt;
}

void expressionEvaluationBreakpoint()
{
}

void expressionEvaluation()
{
    int a = 1, b = 2;
    Point c = { 5, 5 };
    
    expressionEvaluationBreakpoint();
    return;
}

void memoryAccessBreakpoint()
{
}

void memoryAccess()
{
    char array[] = { 0x01, 0x02, 0x03, 0x04 };
    
    memoryAccessBreakpoint();
    return;
}

int main(int argc, const char *argv[])
{
    expressionEvaluation();
    memoryAccess();
    return 0;
}
