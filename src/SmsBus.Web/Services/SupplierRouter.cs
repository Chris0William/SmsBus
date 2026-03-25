using SmsBus.Web.Services.Interfaces;

namespace SmsBus.Web.Services;

public class SupplierRouter
{
    private readonly Dictionary<string, ISupplierService> _map = new(StringComparer.OrdinalIgnoreCase);

    public void Register(ISupplierService supplier)
    {
        _map[supplier.Code] = supplier;
    }

    public ISupplierService Get(string code)
    {
        if (_map.TryGetValue(code, out var supplier))
            return supplier;
        throw new InvalidOperationException($"未注册的供应商: {code}");
    }

    public IEnumerable<ISupplierService> All => _map.Values;
}
