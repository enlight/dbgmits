#include <cstdio>

void funcA()
{
    return; // bp: funcA()
}

void funcB()
{
    return;
}

void funcC()
{
    return;
}

void funcC(int arg1)
{
    return;
}

void funcC(int arg1, bool arg2)
{
    return;
}

int main(int argc, const char *argv[])
{
    funcA();
    funcC(5);
    return 0;
}
