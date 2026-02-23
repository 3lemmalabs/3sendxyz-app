export type SignMessageInput = {
  message: string;
};

export type IdentityApi = {
  getAddress: () => Promise<{ address: string }>;
  signMessage: (input: SignMessageInput) => Promise<{ signature: `0x${string}` }>;
};

export type ThreeSendApi = {
  identity: IdentityApi;
};
