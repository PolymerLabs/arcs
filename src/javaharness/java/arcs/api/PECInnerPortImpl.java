package arcs.api;

import javax.inject.Inject;

public class PECInnerPortImpl implements PECInnerPort {
    private ShellApi shellApi;

    @Inject
    public PECInnerPortImpl(ShellApi shellApi) {
      this.shellApi = shellApi;
    }

    @Override
    public void InitializeProxy(StorageProxy storageProxy) {
        // TODO: Implement.
        this.shellApi.postMessage("InitializeProxy: " + storageProxy.id);
    }

    @Override
    public void SynchronizeProxy(StorageProxy storageProxy) {
        // TODO: Implement.
        this.shellApi.postMessage("SynchronizeProxy: " + storageProxy.id);
    }
}
