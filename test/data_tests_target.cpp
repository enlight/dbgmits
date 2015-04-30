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

int main(int argc, const char *argv[])
{
    expressionEvaluation();
    return 0;
}
