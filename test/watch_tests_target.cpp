#include <cstdio>

struct Point
{
    float x;
    float y;
};

bool funcWithMoreVariablesToWatch_Inner()
{
    return true;
}

void funcWithMoreVariablesToWatch()
{
    Point e = { 5, 10 };
	float f = 9.5f;
	
	funcWithMoreVariablesToWatch_Inner();
	
	// tests expect these assignments to all be on the same line
	e.x = 1; e.y = 1; f = 11;
	// this return statement may seem redundant but the tests rely on it
	return;
}

void funcWithVariablesToWatch()
{
    int e = 5;
    float f = 5;
	float *g = &f;
	
	funcWithMoreVariablesToWatch();
	return;
}

int main(int argc, const char *argv[])
{
	funcWithVariablesToWatch();
    return 0;
}
