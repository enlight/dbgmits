#include <cstdio>

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
	
    return 0;
}
