#include <cstdio>

struct Point
{
    float x;
    float y;
};

bool funcWithNoArgs()
{
    return true;
}

int funcWithOneSimpleArg(int a)
{
    return a;
}

float funcWithTwoArgs(float b, Point c)
{
    return b + c.x + c.y;
}

bool funcWithThreeArgs(long d, const char* e, int f[3])
{
    return true;
}

// This function is just used as a location marker in funcWithOneSimpleLocalVariable(),
// makes it possible to set a breakpoint after the local variables in 
// funcWithOneSimpleLocalVariable() have been initialized without having to specify
// a source line number which is bound to change as this source file is modified to
// accommodate new tests.
bool funcWithOneSimpleLocalVariable_Inner()
{
    return true;
}

void funcWithOneSimpleLocalVariable()
{
    int a = 5;
	
	funcWithOneSimpleLocalVariable_Inner();
}

// This function is just used as a location marker in funcWithOneComplexLocalVariable(),
// makes it possible to set a breakpoint after the local variables in 
// funcWithOneComplexLocalVariable() have been initialized without having to specify
// a source line number which is bound to change as this source file is modified to
// accommodate new tests.
bool funcWithOneComplexLocalVariable_Inner()
{
    return true;
}

void funcWithOneComplexLocalVariable()
{
    int b[] = { 3, 5, 7 };
	
	funcWithOneComplexLocalVariable_Inner();
}

// This function is just used as a location marker in funcWithTwoLocalVariables(),
// makes it possible to set a breakpoint after the local variables in 
// funcWithTwoLocalVariables() have been initialized without having to specify
// a source line number which is bound to change as this source file is modified to
// accommodate new tests.
bool funcWithTwoLocalVariables_Inner()
{
    return true;
}

void funcWithTwoLocalVariables()
{
    bool c = true;
	const char* d[] = { "This", "is", "Dog" };
	
	funcWithTwoLocalVariables_Inner();
}

// This function is just used as a location marker in funcWithThreeLocalVariables(),
// makes it possible to set a breakpoint after the local variables in 
// funcWithThreeLocalVariables() have been initialized without having to specify
// a source line number which is bound to change as this source file is modified to
// accommodate new tests.
bool funcWithThreeLocalVariables_Inner()
{
    return true;
}

float funcWithThreeLocalVariables()
{
	Point e = { 5, 10 };
	float f = 9.5f;
	long g = 300;
	
	funcWithThreeLocalVariables_Inner();
	// the return value is irrelevant,
	// this calculation is just a way to avoid warnings about unused variables
	return e.x + e.y + f + g;
}

int getNextInt()
{
    static int nextInt = 0;
    return nextInt++;
}

void printNextInt()
{
    int nextInt = getNextInt();
    printf("%d\n", nextInt);
}

int main(int argc, const char *argv[])
{
    for (int i = 0; i < 10; ++i)
	{
		printNextInt();
	}
	
	funcWithOneSimpleLocalVariable();
	funcWithOneComplexLocalVariable();
	funcWithTwoLocalVariables();
	funcWithThreeLocalVariables();
	
	funcWithNoArgs();
	funcWithOneSimpleArg(5);
	funcWithTwoArgs(7.0f, { 7.0f, 9.0f });
	int threeInts[] = { 1, 2, 3 };
	funcWithThreeArgs(300, "Test", threeInts);
	
    return 0;
}
