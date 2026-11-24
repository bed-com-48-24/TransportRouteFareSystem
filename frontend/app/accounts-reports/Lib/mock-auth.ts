const ACCOUNTS_KEY = "transport_test_accounts";

type Account = {
  fullName: string;
  email: string;
  password: string;
};

export function registerMockAccount(account: Account): boolean {
  if (typeof window === "undefined") return false;

  const accounts: Account[] = JSON.parse(
    localStorage.getItem(ACCOUNTS_KEY) || "[]"
  );

  const email = account.email.trim().toLowerCase();

  if (accounts.some((item) => item.email === email)) {
    return false;
  }

  accounts.push({
    ...account,
    email,
  });

  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  return true;
}

export function mockLogin(
  email: string,
  password: string
): boolean {
  if (typeof window === "undefined") return false;

  const accounts: Account[] = JSON.parse(
    localStorage.getItem(ACCOUNTS_KEY) || "[]"
  );

  const account = accounts.find(
    (account) =>
      account.email === email.trim().toLowerCase() &&
      account.password === password
  );

  if (!account) {
    return false;
  }

  // Save the currently logged-in user
  localStorage.setItem(
    "loggedInUser",
    JSON.stringify({
      fullName: account.fullName,
      email: account.email,
    })
  );

  return true;
}