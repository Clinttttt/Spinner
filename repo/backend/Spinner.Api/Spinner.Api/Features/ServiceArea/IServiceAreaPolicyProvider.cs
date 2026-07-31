namespace Spinner.Api.Features.ServiceArea;

/// <summary>
/// Supplies the policy that is currently in force.
/// </summary>
/// <remarks>
/// The seam that keeps the area model swappable. Today it always builds a
/// radius policy from business settings. Adding polygon or per-zone support
/// means changing this provider and adding an <see cref="IServiceAreaPolicy"/>
/// implementation; every caller stays untouched.
/// </remarks>
public interface IServiceAreaPolicyProvider
{
    Task<IServiceAreaPolicy> GetAsync(CancellationToken cancellationToken);
}
