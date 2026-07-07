package nl.seanderoo.inventory.controller;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class InventoryControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser
    void inventoryItem_fullLifecycle_createReadUpdateDelete() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/inventory")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Test Oats",
                                  "category": "grains",
                                  "location": "Pantry",
                                  "quantity": 500,
                                  "unit": "grams"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("Test Oats"))
                .andExpect(jsonPath("$.location").value("Pantry"))
                .andReturn();

        long id = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();

        mockMvc.perform(get("/api/inventory/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Test Oats"))
                .andExpect(jsonPath("$.quantity").value(500.0));

        mockMvc.perform(put("/api/inventory/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Test Oats",
                                  "category": "grains",
                                  "location": "Pantry",
                                  "quantity": 250,
                                  "unit": "grams"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quantity").value(250.0));

        mockMvc.perform(delete("/api/inventory/" + id))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/inventory/" + id))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void getAllItems_returnsList() throws Exception {
        mockMvc.perform(get("/api/inventory"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
