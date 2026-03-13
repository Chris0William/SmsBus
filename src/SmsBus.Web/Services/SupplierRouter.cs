using SmsBus.Web.Services.Interfaces;

namespace SmsBus.Web.Services;

public class SupplierRouter
{
    private readonly Dictionary<string, ISupplierService> _map;

    public SupplierRouter(IEnumerable<ISupplierService> suppliers)
    {
        _map = suppliers.ToDictionary(s => s.Code, StringComparer.OrdinalIgnoreCase);
    }

    public ISupplierService Get(string code)
    {
        if (_map.TryGetValue(code, out var supplier))
            return supplier;
        throw new InvalidOperationException($"未注册的供应商: {code}");
    }

    public IEnumerable<ISupplierService> All => _map.Values;
}
