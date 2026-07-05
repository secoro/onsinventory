package nl.seanderoo.inventory.repository;

import nl.seanderoo.inventory.model.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LocationRepository extends JpaRepository<Location, Long> {
    Optional<Location> findByNameAndHouseholdId(String name, Long householdId);
    Optional<Location> findByIdAndHouseholdId(Long id, Long householdId);
    List<Location> findAllByHouseholdId(Long householdId);
}
