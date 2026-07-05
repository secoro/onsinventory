package nl.seanderoo.inventory.repository;

import nl.seanderoo.inventory.model.HouseholdInvite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HouseholdInviteRepository extends JpaRepository<HouseholdInvite, Long> {
    Optional<HouseholdInvite> findByToken(String token);
}
