-- MySQL dump 10.13  Distrib 8.0.41, for Linux (x86_64)
--
-- Host: localhost    Database: workouts
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `movements`
--

LOCK TABLES `movements` WRITE;
/*!40000 ALTER TABLE `movements` DISABLE KEYS */;
INSERT INTO `movements` VALUES (1,'Squats','[\"a\", \"b\", \"c\"]','bilateral','quads, glutes','Don\'t trust mirror for depth. Pause before and after sets.'),(2,'BB Bench','[\"d\", \"e\", \"f\"]','bilateral','chest, triceps',''),(3,'normal Deadlift','[\"g\", \"h\", \"i\"]','bilateral','glutes, hamstrings, spinal erectors','have shins perpendicular to floor much as possible'),(4,'Tricep pushdown','[\"j\", \"k\", \"l\"]','bilateral','triceps','- let wrists come above elbows\n- pause just enough at end of eccentric to remove bounce'),(5,'Leg Press','[\"m\", \"n\", \"o\"]','bilateral','Quads, Glutes',''),(6,'Cable OH Tricep Ext','[\"p\", \"q\", \"r\", \"jjjj\"]','bilateral','Triceps','Keep elbows by head'),(7,'Cable bicep curls bilateral','[\"s\", \"t\", \"u\"]','bilateral','Biceps',''),(8,'DB Bicep Curl','[\"v\", \"w\", \"x\"]','unilateral','Biceps',''),(9,'Stair Stepper','[\"y\", \"z\", \"aa\"]','cardio','cardio',''),(10,'Elliptical','[\"ab\", \"ac\", \"ad\"]','cardio','cardio',''),(11,'leg extension','[\"ae\", \"af\", \"ag\"]','bilateral','quads',''),(12,'Dumbbell Lunge','[\"DB Lunge\", \"db lunge\"]','unilateral','Quads',''),(13,'Smith Machine Bench Press','[\"Smith Bench\", \"Smith Bench Press\", \"Smith Machine BP\"]','bilateral','Pecs',''),(14,'Ab twist machine','[\"machine twists\", \"ab machine twist trunk\", \"ab twists\"]','bilateral','abdominals','twist hips not spine'),(15,'Sissy Squat','[]','bilateral','Quads','Like Sissiphus'),(16,'test a','[]','bilateral','a',''),(17,'test b','[]','bilateral','b',''),(18,'test c','[]','bilateral','c',''),(19,'test d','[]','bilateral','head',''),(20,'test e','[]','bilateral','neck',''),(21,'test f','[\"f test\", \"foot test\"]','bilateral','feetsies','a test movement'),(22,'test g','[\"\"]','bilateral','head','');
/*!40000 ALTER TABLE `movements` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-07-10 16:57:50
